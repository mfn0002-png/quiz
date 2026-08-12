import { useState, useEffect } from 'react';
import { playCorrect, playWrong } from '../utils/sounds';
import { User } from '../firebase';
import { Question } from '../data/questions';
import {
  createChallenge,
  getChallenge,
  submitChallengeResult,
  buildChallengeLink,
  ChallengeDoc,
  ChallengeParticipant,
} from '../services/challengeService';

interface UseChallengeParams {
  user: User | null;
  onError: (message: string) => void;
}

export function useChallenge({ user, onError }: UseChallengeParams) {
  const [challenge, setChallenge] = useState<ChallengeDoc | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeStartedAnswering, setChallengeStartedAnswering] = useState(false);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeSelected, setChallengeSelected] = useState<number | null>(null);
  const [challengeScore, setChallengeScore] = useState(0);
  const [challengeAnswers, setChallengeAnswers] = useState<(number | null)[]>([]);
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [challengeLink, setChallengeLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Charger un défi depuis l'URL (?challenge=ID) au montage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('challenge');
    if (!cid) return;
    setChallengeLoading(true);
    getChallenge(cid)
      .then(data => {
        if (data) {
          setChallenge(data);
          setChallengeAnswers(new Array(data.questions.length).fill(null));
        } else {
          onError("Ce défi n'existe pas ou a expiré.");
        }
      })
      .catch(err => {
        console.error(err);
        onError("Impossible de charger le défi.");
      })
      .finally(() => setChallengeLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createChallengeFromResult = async (
    questions: Question[],
    score: number,
    answers: (number | null)[]
  ) => {
    if (!user) return;
    setCreatingChallenge(true);
    try {
      const challenger: ChallengeParticipant = {
        userId: user.uid,
        displayName: user.displayName || 'Joueur',
        photoURL: user.photoURL || null,
        score,
        answers,
      };
      const id = await createChallenge(questions, challenger);
      setChallengeLink(buildChallengeLink(id));
    } catch (err) {
      console.error("Erreur création du défi :", err);
      onError("Impossible de créer le défi pour le moment.");
    } finally {
      setCreatingChallenge(false);
    }
  };

  const resetChallengeLink = () => setChallengeLink(null);

  const copyLink = async () => {
    if (!challengeLink) return;
    try {
      await navigator.clipboard.writeText(challengeLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const answerChallengeQuestion = (optionIndex: number) => {
    if (!challenge || challengeSelected !== null) return;
    const question = challenge.questions[challengeIndex];
    const correct = optionIndex === question.correctAnswerIndex;
    setChallengeSelected(optionIndex);

    if (correct) {
      playCorrect();
      setChallengeScore(prev => prev + 1);
    } else {
      playWrong();
    }

    setChallengeAnswers(prev => {
      const next = [...prev];
      next[challengeIndex] = optionIndex;
      return next;
    });
  };

  const goToNextChallengeQuestion = async () => {
    if (!challenge || !user) return;
    if (challengeIndex < challenge.questions.length - 1) {
      setChallengeIndex(prev => prev + 1);
      setChallengeSelected(null);
    } else {
      const opponent: ChallengeParticipant = {
        userId: user.uid,
        displayName: user.displayName || 'Joueur',
        photoURL: user.photoURL || null,
        score: challengeScore,
        answers: challengeAnswers,
      };
      try {
        await submitChallengeResult(challenge.id, opponent);
        setChallenge(prev => (prev ? { ...prev, opponent } : prev));
      } catch (err) {
        console.error("Erreur soumission du défi :", err);
        onError("Impossible d'enregistrer votre résultat de défi.");
      }
    }
  };

  const closeChallenge = () => {
    setChallenge(null);
    setChallengeStartedAnswering(false);
    setChallengeIndex(0);
    setChallengeSelected(null);
    setChallengeScore(0);
    setChallengeAnswers([]);
    // Retire le paramètre ?challenge de l'URL sans recharger la page
    const url = new URL(window.location.href);
    url.searchParams.delete('challenge');
    window.history.replaceState({}, '', url.toString());
  };

  return {
    challenge,
    challengeLoading,
    challengeStartedAnswering, setChallengeStartedAnswering,
    challengeIndex,
    challengeSelected,
    challengeScore,
    creatingChallenge,
    challengeLink,
    linkCopied,
    createChallengeFromResult,
    resetChallengeLink,
    copyLink,
    answerChallengeQuestion,
    goToNextChallengeQuestion,
    closeChallenge,
  };
}
