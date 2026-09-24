import { saveAssistantFeedback, getFeedbackStats } from '../backend/src/services/feedbackService.js';

async function runTest() {
  console.log("🧪 Test d'évaluation Assistant RAG -> Firestore...");

  const mockFeedbackGood = {
    question: "Quels sont les 5 piliers de l'Islam ?",
    answer: "Les 5 piliers de l'Islam sont : la Shahada, la Salat, la Zakat, le Sawm et le Hajj.",
    rating: "good",
    comment: "Explication claire et complète",
    sources: [{ title: "knowledge_base_noorquiz.pdf", score: 0.92 }],
    conversationId: "conv_test_123",
    clientId: "guest_test_user"
  };

  const mockFeedbackBad = {
    question: "Combien de versets compte la Sourate Al-Baqarah ?",
    answer: "La Sourate Al-Baqarah compte 200 versets.",
    rating: "bad",
    feedbackReason: "inaccurate",
    comment: "Erreur, elle compte 286 versets.",
    sources: [{ title: "knowledge_base_noorquiz.pdf", score: 0.65 }],
    conversationId: "conv_test_124",
    clientId: "guest_test_user"
  };

  try {
    const resGood = await saveAssistantFeedback(mockFeedbackGood);
    console.log("✓ Évaluation Good enregistrée :", resGood);

    const resBad = await saveAssistantFeedback(mockFeedbackBad);
    console.log("✓ Évaluation Bad enregistrée :", resBad);

    const stats = await getFeedbackStats();
    console.log("📊 Statistiques Firestore actuelles :", stats);

    console.log("\n🎉 Test réussi avec succès !");
    process.exit(0);
  } catch (err) {
    console.error("❌ Échec du test :", err);
    process.exit(1);
  }
}

runTest();
