#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
  RAG KNOWLEDGE BASE GENERATOR & AGENT QUIZ
  Inspiré du workflow n8n : 'RAG Practice.json'
=============================================================================
Ce script reproduit et étend en Python le pipeline complet du fichier n8n :
  1. Ingestion de documents (PDF, TXT, MD)
  2. Découpage intelligent en chunks avec chevauchement (Recursive Chunking)
  3. Génération d'embeddings vectoriels avec Google Gemini (text-embedding-004)
  4. Stockage vectoriel compatible :
       - Supabase Vector Store (table 'documents' + RPC 'match_documents' de n8n)
       - Local Vector Store (JSON/NumPy autonome, sans inscription requise)
  5. Recherche sémantique et Agent IA Quiz (génération de questions & réponses fiables)
=============================================================================
"""

import os
import sys
import json
import time
import math
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# Chargement automatique des variables d'environnement (avec fallback natif)
def load_env_fallback(file_path: Path):
    if not file_path.exists():
        return
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val

try:
    from dotenv import load_dotenv
    has_dotenv = True
except ImportError:
    has_dotenv = False

env_paths = [Path(".env"), Path("backend/.env"), Path("../backend/.env")]
for p in env_paths:
    if p.exists():
        if has_dotenv:
            load_dotenv(p)
        else:
            load_env_fallback(p)
        break

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

LOCAL_STORE_PATH = Path("knowledge_base.json")
EMBEDDING_MODEL = "models/text-embedding-004"
CHAT_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")


# =============================================================================
# 1. PARSING & EXTRACTION DU DOCUMENT
# =============================================================================

def extract_text_from_pdf(pdf_path: Path) -> List[Dict[str, Any]]:
    """
    Extrait le texte page par page d'un fichier PDF avec métadonnées.
    """
    try:
        from pypdf import PdfReader
    except ImportError:
        print("❌ Erreur : 'pypdf' n'est pas installé. Lancez : pip install pypdf")
        sys.exit(1)

    reader = PdfReader(str(pdf_path))
    pages_data = []

    for i, page in enumerate(reader.pages):
        raw_text = page.extract_text() or ""
        # Nettoyage de base
        cleaned = " ".join(raw_text.split())
        if cleaned:
            pages_data.append({
                "page": i + 1,
                "text": cleaned,
                "source": pdf_path.name
            })

    return pages_data


def extract_text_from_textfile(file_path: Path) -> List[Dict[str, Any]]:
    """
    Extrait le texte d'un fichier TXT ou Markdown.
    """
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    # Découpage par sections (titres Markdown) ou paragraphes majeurs
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    pages_data = []

    current_chunk = []
    current_len = 0
    simulated_page = 1

    for p in paragraphs:
        current_chunk.append(p)
        current_len += len(p)
        if current_len >= 1500:  # ~ 1 page standard
            pages_data.append({
                "page": simulated_page,
                "text": "\n\n".join(current_chunk),
                "source": file_path.name
            })
            current_chunk = []
            current_len = 0
            simulated_page += 1

    if current_chunk:
        pages_data.append({
            "page": simulated_page,
            "text": "\n\n".join(current_chunk),
            "source": file_path.name
        })

    return pages_data


def load_document(file_path: str) -> List[Dict[str, Any]]:
    """
    Charge un document selon son extension (.pdf, .txt, .md).
    """
    p = Path(file_path)
    if not p.exists():
        raise FileNotFoundError(f"Le fichier '{file_path}' n'existe pas.")

    suffix = p.suffix.lower()
    if suffix == ".pdf":
        return extract_text_from_pdf(p)
    elif suffix in [".txt", ".md", ".json"]:
        return extract_text_from_textfile(p)
    else:
        raise ValueError(f"Format non supporté ({suffix}). Utilisez .pdf, .txt ou .md.")


# =============================================================================
# 2. CHUNKING INTELLIGENT (RECURSIVE TEXT SPLITTING)
# =============================================================================

def recursive_split_text(
    text: str,
    chunk_size: int = 800,
    chunk_overlap: int = 150
) -> List[str]:
    """
    Découpe le texte de manière récursive en respectant la hiérarchie :
    Paragraphes (\n\n) -> Lignes (\n) -> Phrases (. ) -> Mots ( )
    """
    if len(text) <= chunk_size:
        return [text] if text.strip() else []

    separators = ["\n\n", "\n", ". ", "? ", "! ", " ", ""]
    
    def _split(txt: str, seps: List[str]) -> List[str]:
        if len(txt) <= chunk_size:
            return [txt]
        if not seps:
            # Fin des séparateurs : découpage forcé par index
            return [txt[i:i+chunk_size] for i in range(0, len(txt), chunk_size - chunk_overlap)]

        sep = seps[0]
        remaining_seps = seps[1:]

        if sep == "":
            return [txt[i:i+chunk_size] for i in range(0, len(txt), chunk_size - chunk_overlap)]

        parts = txt.split(sep)
        chunks = []
        current = ""

        for part in parts:
            candidate = current + (sep if current else "") + part
            if len(candidate) <= chunk_size:
                current = candidate
            else:
                if current:
                    chunks.append(current)
                    # Gestion du chevauchement (overlap)
                    if chunk_overlap > 0 and len(current) > chunk_overlap:
                        overlap_start = max(0, len(current) - chunk_overlap)
                        current = current[overlap_start:] + sep + part
                    else:
                        current = part
                else:
                    # Le morceau seul dépasse chunk_size, on le découpe avec le séparateur suivant
                    sub_chunks = _split(part, remaining_seps)
                    chunks.extend(sub_chunks)
                    current = ""

        if current.strip():
            chunks.append(current.strip())

        return chunks

    return _split(text, separators)


def create_chunks_from_pages(
    pages_data: List[Dict[str, Any]],
    chunk_size: int = 800,
    chunk_overlap: int = 150
) -> List[Dict[str, Any]]:
    """
    Découpe l'ensemble des pages d'un document en chunks enrichis de métadonnées.
    """
    all_chunks = []
    chunk_id = 0

    for page_info in pages_data:
        page_num = page_info["page"]
        source = page_info["source"]
        text = page_info["text"]

        splits = recursive_split_text(text, chunk_size, chunk_overlap)
        for sub_index, chunk_text in enumerate(splits):
            chunk_text = chunk_text.strip()
            if len(chunk_text) < 40:  # Ignore les fragments trop courts
                continue

            chunk_id += 1
            all_chunks.append({
                "id": chunk_id,
                "content": chunk_text,
                "metadata": {
                    "source": source,
                    "page": page_num,
                    "chunk_index": sub_index,
                    "char_count": len(chunk_text)
                }
            })

    return all_chunks


# =============================================================================
# 3. EMBEDDINGS AVEC GOOGLE GEMINI
# =============================================================================

def get_gemini_embeddings(texts: List[str], batch_size: int = 10) -> List[List[float]]:
    """
    Calcule les embeddings pour une liste de textes via l'API Gemini.
    Modèle : text-embedding-004 (768 dimensions).
    """
    if not GEMINI_API_KEY:
        print("❌ Erreur : variable GEMINI_API_KEY non définie.")
        print("💡 Ajoutez-la dans votre backend/.env ou exportez-la : export GEMINI_API_KEY=...")
        sys.exit(1)

    try:
        import google.generativeai as genai
    except ImportError:
        print("❌ Erreur : 'google-generativeai' n'est pas installé. Lancez : pip install google-generativeai")
        sys.exit(1)

    genai.configure(api_key=GEMINI_API_KEY)
    embeddings = []

    total = len(texts)
    print(f"🧠 Génération des embeddings Gemini ({EMBEDDING_MODEL}) pour {total} chunks...")

    for i in range(0, total, batch_size):
        batch = texts[i:i + batch_size]
        success = False
        retries = 3

        while retries > 0 and not success:
            try:
                # Appel direct pour le batch
                result = genai.embed_content(
                    model=EMBEDDING_MODEL,
                    content=batch,
                    task_type="retrieval_document"
                )
                batch_embeddings = result['embedding']
                embeddings.extend(batch_embeddings)
                success = True
                print(f"  ✓ {min(i + batch_size, total)} / {total} chunks vectorisés")
                time.sleep(0.3)  # Respect du quota
            except Exception as e:
                retries -= 1
                print(f"  ⚠️ Erreur API Gemini (reste {retries} essais) : {e}")
                time.sleep(2)
                if retries == 0:
                    raise e

    return embeddings


def get_single_embedding(query: str) -> List[float]:
    """
    Calcule l'embedding pour une question / requête utilisateur.
    """
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)

    result = genai.embed_content(
        model=EMBEDDING_MODEL,
        content=query,
        task_type="retrieval_query"
    )
    return result['embedding']


# =============================================================================
# 4. VECTOR STORES : LOCAL (JSON/NumPy) & SUPABASE (n8n compatible)
# =============================================================================

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calcul de similarité cosinus entre 2 vecteurs."""
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


class LocalVectorStore:
    """Vector store local persistant au format JSON."""
    def __init__(self, file_path: Path = LOCAL_STORE_PATH):
        self.file_path = file_path
        self.documents = []
        self.load()

    def load(self):
        if self.file_path.exists():
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    self.documents = json.load(f)
            except Exception as e:
                print(f"⚠️ Impossible de charger {self.file_path}: {e}")
                self.documents = []

    def save(self):
        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump(self.documents, f, ensure_ascii=False, indent=2)

    def add_documents(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]):
        for chunk, emb in zip(chunks, embeddings):
            self.documents.append({
                "id": chunk["id"],
                "content": chunk["content"],
                "metadata": chunk["metadata"],
                "embedding": emb
            })
        self.save()
        print(f"💾 {len(chunks)} chunks sauvegardés localement dans '{self.file_path}'.")

    def search(self, query_embedding: List[float], top_k: int = 4) -> List[Dict[str, Any]]:
        scored = []
        for doc in self.documents:
            sim = cosine_similarity(query_embedding, doc["embedding"])
            scored.append({
                "content": doc["content"],
                "metadata": doc["metadata"],
                "similarity": sim
            })
        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]


class SupabaseVectorStore:
    """
    Vector store Supabase pgvector compatible avec le nœud n8n 'RAG Practice.json'
    Table attendue : 'documents'
    RPC attendu    : 'match_documents'
    """
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("SUPABASE_URL et SUPABASE_KEY doivent être définis pour Supabase.")
        try:
            from supabase import create_client
            self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
        except ImportError:
            raise ImportError("Installez le client supabase : pip install supabase")

    def add_documents(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]):
        records = []
        for chunk, emb in zip(chunks, embeddings):
            records.append({
                "content": chunk["content"],
                "metadata": chunk["metadata"],
                "embedding": emb
            })
        
        # Insertion par lots de 50
        batch_size = 50
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            self.client.table("documents").insert(batch).execute()
        print(f"🚀 {len(records)} chunks insérés avec succès dans Supabase (table 'documents') !")

    def search(self, query_embedding: List[float], top_k: int = 4) -> List[Dict[str, Any]]:
        # Appelle la fonction RPC 'match_documents' exactement comme n8n
        res = self.client.rpc("match_documents", {
            "query_embedding": query_embedding,
            "match_count": top_k
        }).execute()
        return res.data or []


def get_vector_store(use_supabase: bool = False):
    if use_supabase:
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                return SupabaseVectorStore()
            except Exception as e:
                print(f"⚠️ Échec connexion Supabase ({e}), bascule sur le store Local.")
        else:
            print("ℹ️ Clés Supabase non trouvées, utilisation du store Local (knowledge_base.json).")
    return LocalVectorStore()


# =============================================================================
# 5. AGENT IA : RECHERCHE SÉMANTIQUE & GÉNÉRATION DE QUIZ
# =============================================================================

def answer_with_rag(query: str, store, top_k: int = 4) -> str:
    """
    Répond à une question en utilisant STRICTEMENT les passages extraits de la base.
    """
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)

    print(f"\n🔍 Recherche de passages pertinents pour : '{query}'...")
    query_emb = get_single_embedding(query)
    results = store.search(query_emb, top_k=top_k)

    if not results:
        return "Aucune information trouvée dans la base de connaissances."

    context_parts = []
    print("\n📚 Sources trouvées :")
    for idx, r in enumerate(results, 1):
        meta = r.get("metadata", {})
        page = meta.get("page", "?")
        source = meta.get("source", "Document")
        sim = r.get("similarity", 0)
        print(f"  [{idx}] Page {page} de {source} (Similarité : {sim:.3f})")
        context_parts.append(f"--- Extrait {idx} (Source: {source}, Page {page}) ---\n{r['content']}")

    context = "\n\n".join(context_parts)

    system_prompt = (
        "Tu es un assistant expert et rigoureux. Tu réponds à la question de l'utilisateur "
        "en te basant STRICTEMENT et UNIQUEMENT sur les extraits fournis ci-dessous.\n"
        "RÈGLES D'OR :\n"
        "1. Ne jamais inventer ou extrapoler (ZÉRO hallucination).\n"
        "2. Si l'information ne figure pas explicitement dans les extraits, dis clairement que le document ne le mentionne pas.\n"
        "3. Indique toujours la référence de la page à la fin de ta réponse (ex: [Source: Rules.pdf, Page 12])."
    )

    user_prompt = f"EXTRAITS DU DOCUMENT :\n{context}\n\nQUESTION DE L'UTILISATEUR :\n{query}"

    model = genai.GenerativeModel(
        model_name=CHAT_MODEL,
        system_instruction=system_prompt
    )

    response = model.generate_content(user_prompt)
    return response.text


def generate_quiz_from_document(topic: str, store, num_questions: int = 3) -> str:
    """
    Génère des questions de Quiz QCM (au format NoorQuiz) basées sur la base de connaissances.
    """
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)

    print(f"\n🎲 Extraction du contexte pour le quiz sur : '{topic}'...")
    query_emb = get_single_embedding(topic)
    results = store.search(query_emb, top_k=6)

    if not results:
        return "Erreur : base de connaissances vide ou aucun passage correspondant."

    context_text = "\n\n".join([f"Page {r.get('metadata', {}).get('page')}: {r['content']}" for r in results])

    system_prompt = (
        "Tu es un générateur de quiz éducatif haute précision. "
        "Tu dois créer un QCM basé UNIQUEMENT sur les règles et faits présents dans le texte fourni."
    )

    prompt = f"""
À partir du contexte suivant extrait d'un document officiel :
{context_text}

Génère {num_questions} questions de quiz à choix multiples (QCM) au format JSON strict.
Chaque question doit respecter cette structure :
[
  {{
    "question": "Texte de la question ?",
    "options": ["Choix A", "Choix B", "Choix C", "Choix D"],
    "correctAnswerIndex": 0,
    "explanation": "Explication détaillée citant la règle ou le passage exact.",
    "sourcePage": 5
  }}
]

Réponds UNIQUEMENT avec le bloc JSON valide, sans texte d'introduction.
"""

    model = genai.GenerativeModel(
        model_name=CHAT_MODEL,
        system_instruction=system_prompt,
        generation_config={"response_mime_type": "application/json"}
    )

    response = model.generate_content(prompt)
    return response.text


# =============================================================================
# 6. INTERFACE CLI
# =============================================================================

def print_banner():
    print("""
╔═══════════════════════════════════════════════════════════════╗
║         🚀 RAG KNOWLEDGE BASE — AGENT & QUIZ                  ║
║      Implémentation Python du Workflow n8n RAG Practice       ║
╚═══════════════════════════════════════════════════════════════╝
    """)


def print_supabase_sql_instructions():
    print("""
📌 Pour utiliser Supabase avec ce script et votre workflow n8n,
   exécutez ce script SQL dans le SQL Editor de votre projet Supabase :

-- 1. Activer l'extension vectorielle
create extension if not exists vector;

-- 2. Créer la table 'documents'
create table if not exists documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(768)
);

-- 3. Créer la fonction RPC 'match_documents' appelée par n8n
create or replace function match_documents (
  query_embedding vector(768),
  match_count int default 5,
  filter jsonb default '{}'
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where filter = '{}' or documents.metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
    """)


def main():
    print_banner()

    parser = argparse.ArgumentParser(description="Générateur de Base de Connaissances RAG & Agent Quiz")
    subparsers = parser.add_subparsers(dest="command", help="Commandes disponibles")

    # Commande 1 : INGEST
    parser_ingest = subparsers.add_parser("ingest", help="Ingérer un document (PDF, TXT, MD)")
    parser_ingest.add_argument("file", type=str, help="Chemin vers le document à ingérer")
    parser_ingest.add_argument("--chunk-size", type=int, default=800, help="Taille des chunks en caractères (défaut: 800)")
    parser_ingest.add_argument("--overlap", type=int, default=150, help="Chevauchement en caractères (défaut: 150)")
    parser_ingest.add_argument("--supabase", action="store_true", help="Sauvegarder dans Supabase (au lieu du store local)")

    # Commande 2 : QUERY
    parser_query = subparsers.add_parser("query", help="Poser une question à l'agent RAG")
    parser_query.add_argument("question", type=str, help="Votre question")
    parser_query.add_argument("--top-k", type=int, default=4, help="Nombre de passages à récupérer")
    parser_query.add_argument("--supabase", action="store_true", help="Chercher dans Supabase")

    # Commande 3 : QUIZ
    parser_quiz = subparsers.add_parser("quiz", help="Générer un quiz QCM à partir de la base")
    parser_quiz.add_argument("topic", type=str, help="Thème ou sujet du quiz")
    parser_quiz.add_argument("--count", type=int, default=3, help="Nombre de questions (défaut: 3)")
    parser_quiz.add_argument("--supabase", action="store_true", help="Chercher dans Supabase")

    # Commande 4 : CHAT
    parser_chat = subparsers.add_parser("chat", help="Lancer un chat interactif avec l'agent")
    parser_chat.add_argument("--supabase", action="store_true", help="Utiliser Supabase")

    # Commande 5 : SQL
    subparsers.add_parser("sql", help="Afficher le script SQL pour configurer Supabase")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    if args.command == "sql":
        print_supabase_sql_instructions()
        return

    use_supabase = getattr(args, "supabase", False)
    store = get_vector_store(use_supabase)

    if args.command == "ingest":
        print(f"📄 Chargement du document : {args.file}")
        pages = load_document(args.file)
        print(f"✓ {len(pages)} pages/sections extraites.")

        print(f"✂️ Découpage en chunks (taille={args.chunk_size}, overlap={args.overlap})...")
        chunks = create_chunks_from_pages(pages, args.chunk_size, args.overlap)
        print(f"✓ {len(chunks)} chunks générés.")

        # Calcul des embeddings
        texts = [c["content"] for c in chunks]
        embeddings = get_gemini_embeddings(texts)

        # Sauvegarde
        store.add_documents(chunks, embeddings)
        print("🎉 Base de connaissances prête ! Vous pouvez maintenant poser des questions avec 'python rag_knowledge_base.py query \"...\"'")

    elif args.command == "query":
        answer = answer_with_rag(args.question, store, top_k=args.top_k)
        print("\n" + "=" * 60)
        print("🤖 RÉPONSE DE L'AGENT :")
        print("=" * 60)
        print(answer)
        print("=" * 60)

    elif args.command == "quiz":
        quiz_json = generate_quiz_from_document(args.topic, store, num_questions=args.count)
        print("\n" + "=" * 60)
        print("🎯 QUIZ GÉNÉRÉ (Format NoorQuiz) :")
        print("=" * 60)
        try:
            parsed = json.loads(quiz_json)
            print(json.dumps(parsed, indent=2, ensure_ascii=False))
        except Exception:
            print(quiz_json)
        print("=" * 60)

    elif args.command == "chat":
        print("\n💬 Mode Chat interactif avec l'Agent RAG (Tapez 'quit' pour quitter)\n")
        while True:
            try:
                q = input("👤 Vous: ").strip()
                if not q:
                    continue
                if q.lower() in ["quit", "exit", "q"]:
                    print("Au revoir ! 👋")
                    break
                ans = answer_with_rag(q, store, top_k=3)
                print(f"\n🤖 Agent: {ans}\n")
            except (KeyboardInterrupt, EOFError):
                print("\nAu revoir ! 👋")
                break


if __name__ == "__main__":
    main()
