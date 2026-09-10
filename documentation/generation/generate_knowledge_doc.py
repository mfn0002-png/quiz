#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
  GÉNÉRATEUR DE DOCUMENT POUR BASE DE CONNAISSANCES RAG
  Fichier cible : knowledge_base_noorquiz.pdf / .md
=============================================================================
Ce script produit un document de référence structuré et exhaustif destiné
à servir de SOURCE pour votre pipeline RAG (ex: workflow n8n 'RAG Practice.json'
ou ingestion dans Supabase / PgVector).

Caractéristiques du document généré :
  - Découpage par Chapitres, Sections et Règles claires.
  - Références textuelles exactes (Sourates, Versets, Rapporteurs de Hadiths).
  - Paires "Questions Fréquentes / Réponses" intégrées dans chaque section
    (optimise drastiquement le matching sémantique des Embeddings).
  - Double export : PDF prêt à être uploadé (Google Drive / MinIO / n8n)
    et Markdown (.md) pour consultation directe.
=============================================================================
"""

import os
import sys
import argparse
from pathlib import Path

# Chargement optionnel de reportlab pour le rendu PDF
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
    )
    from reportlab.pdfgen import canvas
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


# =============================================================================
# CONTENU DE LA BASE DE CONNAISSANCES DE RÉFÉRENCE
# =============================================================================

KNOWLEDGE_DATA = [
    {
        "module_id": "MOD-01",
        "title": "Module 1 : Les Fondements et les 6 Piliers de la Foi (Al-Iman)",
        "sections": [
            {
                "subtitle": "1.1 Le Tawhid (L'Unicité Divine)",
                "rules": [
                    "Règle 1 : Le Tawhid ar-Rouboubiya (Seigneurie) est la croyance qu'Allah est le seul Créateur, Souverain et Pourvoyeur de l'Univers.",
                    "Règle 2 : Le Tawhid al-Oulouhiya (Adoration) stipule qu'aucun acte d'adoration (prière, sacrifice, invocation, voeu) ne peut être voué à un autre qu'Allah.",
                    "Règle 3 : Le Tawhid al-Asma wa Sifat (Noms et Attributs) implique d'attribuer à Allah les 99 Noms et Attributs qu'Il s'est attribués sans ressemblance (tamthil) ni négation (ta'til)."
                ],
                "sources": "Coran : Sourate Al-Ikhlas (112:1-4), Sourate Ach-Choura (42:11). Hadith : Hadith de Jibril (Rapporté par Muslim, n°8).",
                "faq": [
                    ("Quelle est la différence entre Rouboubiya et Oulouhiya ?", "La Rouboubiya concerne les actes d'Allah envers Sa création (Créer, Pourvoir), tandis que l'Oulouhiya concerne les actes des serviteurs envers Allah (prier, invoquer, sacrifier)."),
                    ("Combien de piliers comporte la Foi (Al-Iman) ?", "La Foi comporte 6 piliers : la croyance en Allah, en Ses Anges, en Ses Livres, en Ses Messagers, au Jour Dernier, et au Destin (bon ou mauvais).")
                ]
            },
            {
                "subtitle": "1.2 Les Anges et leurs Missions",
                "rules": [
                    "Règle 1 : Les Anges sont créés de lumière, ne mangent pas, ne dorment pas et ne désobéissent jamais à Allah.",
                    "Règle 2 : Jibril (Gabriel) est chargé de la Révélation aux prophètes.",
                    "Règle 3 : Mikaïl (Michel) est chargé des pluies et de la subsistance.",
                    "Règle 4 : Israfil est chargé de souffler dans la Trompe (As-Sour) pour la Résurrection.",
                    "Règle 5 : Malik est le gardien de l'Enfer, et Ridwan est le gardien du Paradis.",
                    "Règle 6 : Munkar et Nakir interrogent le défunt dans sa tombe sur son Seigneur, sa religion et son prophète."
                ],
                "sources": "Coran : Sourate At-Tahrim (66:6), Sourate Az-Zukhruf (43:77). Hadith : Sahih Al-Bukhari (n°3207).",
                "faq": [
                    ("De quoi ont été créés les anges ?", "Les anges ont été créés de lumière, les djinns de feu sans fumée, et Adam d'argile (Hadith Muslim)."),
                    ("Quel ange soufflera dans la Trompe pour le Jour Dernier ?", "L'ange Israfil est chargé de souffler deux fois dans la Trompe.")
                ]
            },
            {
                "subtitle": "1.3 Les Livres Célestes et les Prophètes",
                "rules": [
                    "Règle 1 : Quatre livres majeurs sont mentionnés dans le Coran : la Tawrat (à Moussa / Moïse), le Zabour (à Daoud / David), l'Injil (à Issa / Jésus) et le Coran (à Muhammad ﷺ).",
                    "Règle 2 : 25 prophètes et messagers sont explicitement nommés dans le Noble Coran.",
                    "Règle 3 : Les cinq prophètes doués de grande fermeté (Ouloul 'Azm) sont : Nouh (Noé), Ibrahim (Abraham), Moussa (Moïse), Issa (Jésus) et Muhammad ﷺ.",
                    "Règle 4 : Le Prophète Muhammad ﷺ est le sceau de tous les prophètes (Khatam an-Nabiyyin) ; aucun prophète ne viendra après lui."
                ],
                "sources": "Coran : Sourate Al-Ahzab (33:40), Sourate Al-Baqara (2:285). Hadith : Sahih Al-Bukhari (n°3356).",
                "faq": [
                    ("Combien de prophètes sont cités nommément dans le Coran ?", "25 prophètes sont nommés explicitement dans le Coran."),
                    ("Qui sont les prophètes appelés Ouloul 'Azm ?", "Ce sont Nouh, Ibrahim, Moussa, Issa et Muhammad (que la paix soit sur eux).")
                ]
            }
        ]
    },
    {
        "module_id": "MOD-02",
        "title": "Module 2 : Les 5 Piliers de l'Islam et les Règles du Culte (Al-'Ibadat)",
        "sections": [
            {
                "subtitle": "2.1 La Prière (As-Salat) : Horaires, Conditions et Piliers",
                "rules": [
                    "Règle 1 : Les 5 prières quotidiennes obligatoires sont : Fajr (2 rak'ats), Dhuhr (4 rak'ats), Asr (4 rak'ats), Maghrib (3 rak'ats) et Isha (4 rak'ats).",
                    "Règle 2 : Il y a 9 conditions préalables de validité (Chourout) : être musulman, avoir sa raison, être pubère, purification (woudou/ghousl), propreté du corps/vêtements/lieu, couvrir la 'awra, entrée de l'heure légale, orientation vers la Qibla, intention (Niyya).",
                    "Règle 3 : La prière comporte 14 piliers indispensables (Arkan) sans lesquels la prière est invalide, dont le Takbirat al-Ihram, la récitation de la Sourate Al-Fatiha à chaque unité, le Roukou' (inclinaison), les deux Soujoud (prosternations) et la quiétude (Touma'nina).",
                    "Règle 4 : Les ablutions (Woudou) comportent 4 actes obligatoires coraniques : laver le visage, laver les bras jusqu'aux coudes, passer les mains mouillées sur la tête, et laver les pieds jusqu'aux chevilles (Sourate Al-Ma'ida 5:6)."
                ],
                "sources": "Coran : Sourate Al-Baqara (2:238), Sourate An-Nisa (4:103). Hadith : 'Priez comme vous m'avez vu prier' (Sahih Al-Bukhari, n°631).",
                "faq": [
                    ("La récitation de la Fatiha est-elle obligatoire à chaque rak'at ?", "Oui, la Fatiha est un pilier (rukn) de la prière pour chaque unité selon le hadith : 'Pas de prière pour celui qui ne récite pas la Fatiha' (Bukhari)."),
                    ("Quels sont les actes qui annulent le Woudou ?", "L'évacuation de gaz ou d'urine/selles, le sommeil profond, la perte de conscience, et toucher directement ses parties intimes sans barrière.")
                ]
            },
            {
                "subtitle": "2.2 La Zakat (L'Aumône Légale Obligatoire)",
                "rules": [
                    "Règle 1 : La Zakat al-Maal est le 3ème pilier de l'Islam. Elle est due annuellement par tout musulman possédant le seuil minimal (Nisab) pendant une année hégirienne complète (Hawl).",
                    "Règle 2 : Le taux de la Zakat sur l'argent liquide, l'or et le commerce est de 2.5% (un quarantième ou 1/40).",
                    "Règle 3 : Le seuil légal (Nisab) équivaut à la valeur de 85 grammes d'or pur ou 595 grammes d'argent.",
                    "Règle 4 : Le Coran fixe rigoureusement 8 catégories de bénéficiaires : les pauvres (fouqara), les indigents (masakin), les collecteurs de zakat, ceux dont les cœurs sont à rallier, pour libérer les esclaves, les endettés insolvables, pour la cause d'Allah, et le voyageur en détresse."
                ],
                "sources": "Coran : Sourate At-Tawbah (9:60). Hadith : Sahih Al-Bukhari (n°1454).",
                "faq": [
                    ("Quel est le taux de la Zakat al-Maal ?", "Le taux est de 2.5% de la valeur totale de l'épargne conservée pendant un an hégirien au-delà du Nisab."),
                    ("Quelles sont les personnes qui ont le droit de recevoir la Zakat ?", "Les 8 catégories stipulées dans la Sourate At-Tawbah verset 60 (pauvres, nécessiteux, endettés, etc.).")
                ]
            },
            {
                "subtitle": "2.3 Le Jeûne du Ramadan (As-Siyam) et le Pèlerinage (Al-Hajj)",
                "rules": [
                    "Règle 1 : Le jeûne du mois de Ramadan est obligatoire pour tout musulman pubère, sain d'esprit, résident et en capacité physique.",
                    "Règle 2 : Le jeûne commence à l'aube véritable (Fajr) et se termine au coucher du soleil (Maghrib).",
                    "Règle 3 : Le Hajj (Grand Pèlerinage à La Mecque) est obligatoire une fois dans sa vie pour quiconque en a la capacité financière et physique.",
                    "Règle 4 : Les 4 piliers indispensables du Hajj sont : l'Ihram (sacralisation), le Tawaf al-Ifada (tour de la Kaaba), le Sa'y entre Safa et Marwah, et le stationnement au mont Arafat le 9 Dhoul Hijja."
                ],
                "sources": "Coran : Sourate Al-Baqara (2:183-187), Sourate Al-Hajj (22:27). Hadith : 'Le Hajj, c'est Arafat' (Rapporté par At-Tirmidhi, n°889).",
                "faq": [
                    ("Quel est le jour le plus important du Hajj ?", "Le 9 de Dhoul Hijja, jour du rassemblement sur la plaine du mont Arafat."),
                    ("Quelle nuit de Ramadan est meilleure que mille mois ?", "Laylat al-Qadr (La Nuit du Destin), située dans les 10 dernières nuits impaires de Ramadan (Sourate Al-Qadr 97:3).")
                ]
            }
        ]
    },
    {
        "module_id": "MOD-03",
        "title": "Module 3 : La Sira (Biographie du Prophète Muhammad ﷺ) et les Califes",
        "sections": [
            {
                "subtitle": "3.1 Les Grandes Étapes de la Vie du Prophète ﷺ",
                "rules": [
                    "Règle 1 : Le Prophète Muhammad ﷺ est né à La Mecque en l'An de l'Éléphant (vers 570 du calendrier grégorien), orphelin de père (Abdullah). Sa mère Amina décède lorsqu'il a 6 ans.",
                    "Règle 2 : La première révélation a eu lieu en 610 à l'âge de 40 ans dans la grotte de Hira (Sourate Al-'Alaq 96:1-5).",
                    "Règle 3 : L'Hégire (migration vers Médine / Yathrib) a eu lieu en 622 ap. J.-C. Cet événement historique marque le point de départ du calendrier hégirien (1 AH).",
                    "Règle 4 : La bataille de Badr (an 2 H) fut la première grande victoire musulmane (313 musulmans contre 1000 quraychites).",
                    "Règle 5 : La Conquête pacifique de La Mecque (Fath Makka) s'est produite au mois de Ramadan de l'an 8 de l'Hégire."
                ],
                "sources": "Coran : Sourate Al-Fath (48:1-3), Sourate Al-Anfal (8:9-11). Ouvrage de référence : Ar-Raheeq Al-Makhtum (Le Nectar Cacheté).",
                "faq": [
                    ("En quelle année a eu lieu l'Hégire et que représente-t-elle ?", "L'Hégire a eu lieu en 622 ap. J.-C. Elle marque l'émigration vers Médine et l'an 1 du calendrier islamique."),
                    ("Quel âge avait le Prophète ﷺ lors de sa première révélation ?", "Il avait 40 ans dans la grotte de Hira, en l'an 610 ap. J.-C.")
                ]
            },
            {
                "subtitle": "3.2 Les Quatre Califes Bien Guidés (Al-Khoulafa ar-Rachidoun)",
                "rules": [
                    "Règle 1 : Abou Bakr As-Siddiq (1er calife, 632-634 / 11-13 H) : fidèle compagnon lors de l'Hégire, il a unifié la péninsule après la mort du Prophète et initié la première compilation du Coran.",
                    "Règle 2 : Omar Ibn Al-Khattab (Al-Farouq, 2ème calife, 634-644 / 13-23 H) : connu pour sa justice exemplaire, il a instauré le calendrier hégirien et étendu l'empire musulman.",
                    "Règle 3 : Othman Ibn Affan (Dhul-Nourain, 3ème calife, 644-656 / 23-35 H) : il a fait compiler le Coran sous sa version unique et standardisée (Moushaf Al-Imam) envoyée dans les provinces.",
                    "Règle 4 : Ali Ibn Abi Talib (4ème calife, 656-661 / 35-40 H) : cousin et gendre du Prophète ﷺ (époux de Fatima az-Zahra), illustre pour sa bravoure et son immense savoir religieux."
                ],
                "sources": "Hadith : 'Accrochez-vous à ma tradition et à la tradition des califes bien guidés après moi' (Abou Daoud n°4607, At-Tirmidhi n°2676).",
                "faq": [
                    ("Sous quel califat le Coran a-t-il été standardisé en un livre unique ?", "Sous le califat de Othman Ibn Affan (an 24-35 H)."),
                    ("Qui a institué le calendrier hégirien officiel ?", "Le deuxième calife, Omar Ibn Al-Khattab.")
                ]
            }
        ]
    },
    {
        "module_id": "MOD-04",
        "title": "Module 4 : Les Sciences du Coran et de la Sunnah",
        "sections": [
            {
                "subtitle": "4.1 Structure et Chiffres Clés du Noble Coran",
                "rules": [
                    "Règle 1 : Le Coran compte 114 sourates, divisées en 30 parties égales appelées 'Juz' (ou 60 Hizb).",
                    "Règle 2 : Le Coran compte 6 236 versets (selon le comput kufite officiel de Hafs).",
                    "Règle 3 : La plus longue sourate est Sourate Al-Baqara (286 versets) ; la plus courte est Sourate Al-Kawthar (3 versets).",
                    "Règle 4 : Le plus long verset du Coran est le Verset de la Dette (Ayat ad-Dayn, Sourate Al-Baqara 2:282).",
                    "Règle 5 : Le verset le plus éminent du Coran est Ayat al-Koursi (Verset du Trône, Sourate Al-Baqara 2:255)."
                ],
                "sources": "Coran : Sourate Al-Baqara (2:255 & 2:282), Sourate Al-Kawthar (108:1-3). Hadith : Sahih Muslim (n°810).",
                "faq": [
                    ("Combien de sourates et de versets compte le Coran ?", "Le Coran compte 114 sourates et 6 236 versets."),
                    ("Quel est le verset le plus long du Coran ?", "Le verset de la dette (Ayat ad-Dayn) dans la Sourate Al-Baqara verset 282.")
                ]
            },
            {
                "subtitle": "4.2 Les Sciences du Hadith et les Six Grands Recueils (Koutoub as-Sittah)",
                "rules": [
                    "Règle 1 : Un hadith est constitué de deux parties : l'Isnad (la chaîne de transmission orale) et le Matn (le texte de la parole ou action du Prophète ﷺ).",
                    "Règle 2 : Les deux recueils les plus authentiques de l'Islam sont Sahih Al-Bukhari (de l'imam Al-Bukhari, m. 256 H) et Sahih Muslim (de l'imam Muslim, m. 261 H).",
                    "Règle 3 : Les quatre autres recueils des 6 livres canoniques (Koutoub as-Sittah) sont : Sunan Abi Dawood, Jami' At-Tirmidhi, Sunan An-Nasa'i et Sunan Ibn Majah.",
                    "Règle 4 : Un hadith 'Moutawatir' est rapporté par un si grand nombre de transmetteurs sûrs à chaque époque qu'il est impossible qu'ils se soient accordés sur un mensonge."
                ],
                "sources": "Ouvrages : Al-Muqaddimah de l'imam Ibn As-Salah, Sahih Al-Bukhari, Sahih Muslim.",
                "faq": [
                    ("Quelles sont les deux composantes indispensables d'un hadith ?", "L'Isnad (la chaîne des transmetteurs) et le Matn (le texte même du hadith)."),
                    ("Quels sont les deux recueils de hadiths les plus authentiques ?", "Sahih Al-Bukhari et Sahih Muslim.")
                ]
            }
        ]
    }
]


# =============================================================================
# GÉNÉRATION DU FICHIER MARKDOWN (.MD)
# =============================================================================

def generate_markdown(output_path: Path):
    """
    Génère un fichier Markdown structuré avec balises hiérarchiques et tableaux.
    """
    lines = []
    lines.append("# BASE DE CONNAISSANCES OFFICIELLE — NOORQUIZ IA")
    lines.append("> **Document de Référence RAG (Retrieval-Augmented Generation)**")
    lines.append("> Conçu spécifiquement pour l'ingestion vectorielle et l'alimentation de l'Agent Quiz.\n")
    lines.append("---\n")

    for module in KNOWLEDGE_DATA:
        lines.append(f"## {module['title']}\n")
        for sec in module["sections"]:
            lines.append(f"### {sec['subtitle']}\n")
            lines.append("#### 📜 Règles et Définitions Authentifiées :")
            for r in sec["rules"]:
                lines.append(f"- {r}")
            lines.append(f"\n**Références canoniques :** *{sec['sources']}*\n")

            lines.append("#### ❓ Questions Fréquentes & Réponses de Contrôle (RAG Match) :")
            for q, a in sec["faq"]:
                lines.append(f"* **Q : {q}**")
                lines.append(f"  * **R :** {a}")
            lines.append("\n---\n")

    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"✅ Document Markdown généré : {output_path} ({output_path.stat().st_size} octets)")


# =============================================================================
# GÉNÉRATION DU FICHIER PDF (.PDF) AVEC REPORTLAB
# =============================================================================

class NumberedCanvas(canvas.Canvas):
    """Numérotation automatique des pages 'Page X sur Y'."""
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # En-tête discret
        self.drawString(2 * cm, 28.5 * cm, "NoorQuiz — Base de Connaissances RAG Officielle")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(2 * cm, 28.3 * cm, 19 * cm, 28.3 * cm)

        # Pied de page
        page_text = f"Page {self._pageNumber} sur {page_count}"
        self.drawRightString(19 * cm, 1.2 * cm, page_text)
        self.drawString(2 * cm, 1.2 * cm, "Document de Référence pour Agent IA et Quiz")
        self.line(2 * cm, 1.5 * cm, 19 * cm, 1.5 * cm)
        self.restoreState()


def generate_pdf(output_path: Path):
    """
    Génère un PDF professionnel optimisé pour le découpage RAG (page par page).
    """
    if not REPORTLAB_AVAILABLE:
        print("⚠️ Reportlab n'est pas disponible, seul le fichier Markdown a été créé.")
        return

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2.2 * cm,
        bottomMargin=2.2 * cm
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#065f46"), # Vert émeraude islamique
        alignment=1, # Centré
        spaceAfter=12
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#334155"),
        alignment=1,
        spaceAfter=20
    )

    module_style = ParagraphStyle(
        'ModuleTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#047857"),
        spaceBefore=14,
        spaceAfter=8
    )

    sec_style = ParagraphStyle(
        'SecTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=4
    )

    source_style = ParagraphStyle(
        'SourceNote',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#0284c7"),
        spaceBefore=4,
        spaceAfter=8
    )

    faq_q_style = ParagraphStyle(
        'FaqQ',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=4
    )

    faq_a_style = ParagraphStyle(
        'FaqA',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor("#334155"),
        leftIndent=10,
        spaceAfter=4
    )

    story = []

    # Page de titre / En-tête
    story.append(Paragraph("NOORQUIZ — BASE DE CONNAISSANCES RAG", title_style))
    story.append(Paragraph("Corpus de Référence Officiel pour Agent IA et Génération de Quiz Islamiques", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#059669"), spaceAfter=15))

    for mod_idx, module in enumerate(KNOWLEDGE_DATA):
        if mod_idx > 0:
            story.append(PageBreak())

        story.append(Paragraph(module["title"], module_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=10))

        for sec in module["sections"]:
            story.append(Paragraph(sec["subtitle"], sec_style))

            # Règles
            for r in sec["rules"]:
                story.append(Paragraph(f"• {r}", body_style))

            # Sources
            story.append(Paragraph(f"<b>Références :</b> {sec['sources']}", source_style))

            # FAQ Box (Tableau léger)
            faq_elements = [Paragraph("<b>💡 Questions & Réponses Clés (Pour Embeddings RAG) :</b>", sec_style)]
            for q, a in sec["faq"]:
                faq_elements.append(Paragraph(f"<b>Q : {q}</b>", faq_q_style))
                faq_elements.append(Paragraph(f"R : {a}", faq_a_style))

            box_table = Table([[faq_elements]], colWidths=[17 * cm])
            box_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ]))
            story.append(box_table)
            story.append(Spacer(1, 10))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✅ Document PDF généré : {output_path} ({output_path.stat().st_size} octets)")


# =============================================================================
# EXÉCUTION DU SCRIPT
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Générateur de Document de Référence pour Base de Connaissances RAG")
    parser.add_argument("--format", choices=["all", "pdf", "md"], default="all", help="Format de sortie (défaut: all)")
    parser.add_argument("--name", default="knowledge_base_noorquiz", help="Nom du fichier sans extension (défaut: knowledge_base_noorquiz)")
    args = parser.parse_args()

    base_name = args.name
    md_path = Path(f"{base_name}.md")
    pdf_path = Path(f"{base_name}.pdf")

    print(f"\n📚 Génération du document de base de connaissances...")

    if args.format in ["all", "md"]:
        generate_markdown(md_path)

    if args.format in ["all", "pdf"]:
        generate_pdf(pdf_path)

    print("\n🎉 Terminé avec succès !")
    print(f"👉 Vous pouvez maintenant utiliser '{pdf_path}' dans votre workflow n8n ('RAG Practice.json')")
    print(f"   ou le charger dans votre backend Node.js pour alimenter votre agent quiz.\n")


if __name__ == "__main__":
    main()
