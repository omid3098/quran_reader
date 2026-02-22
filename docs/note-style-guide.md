# Note Style Guide — Omid's Quran Tafseer Notes

> Extracted from ~175 verse notes (Surah 2:1–2:175). This guide captures the writing voice, structure, and analytical patterns so an AI can produce a first draft close to the author's style. **Reference notes: 2:170–2:175 (gold standard).**

## Voice & Tone

### Language

- **Conversational Persian (محاوره‌ای)**: اونا، میگه، میشه، چیکار، بریم، خب، اینجوری
- Mix of محاوره for narration and فصیح for quoting Arabic or making precise statements
- Arabic terms quoted in original script with inline Persian explanation
- Never formal academic Persian. Never stiff.

### Person & Perspective

- First person: «من فکر می‌کنم», «به نظرم», «اگه دقت کنیم»
- Sometimes direct address to audience: «پس با دقت و احتیاط زیادی گوش کنین»
- Self-referential honesty: «به خط‌کش خودم هم این داستان ادعای بزرگیه», «الان می‌فهمم که قبلاً چقدر سطحی بررسی کرده بودم»

### Epistemic Humility (Critical)

- **Always** uses uncertainty markers: شاید، احتمالاً، به نظر میاد، ممکنه، یه خوانش اینه که
- Never claims definitive interpretation
- Presents multiple readings and weighs them honestly
- Sometimes explicitly acknowledges counter-arguments: «شواهد علیه این فرضیه»
- Uses «احتمال می‌دم» not «مطمئنم»

### What This Voice NEVER Does

- No religious cliché language (no صلی الله علیه وسلم, no بسم الله الرحمن الرحیم at start of notes, no formulaic دعا)
- No preaching or moralizing tone
- No dismissing other readings without engaging
- No claiming certainty about tafseer
- No oversimplification that strips transcendent dimension

## Structure Patterns

### Two-Part Note Architecture

Notes are structured in **two distinct parts**, separated by a clear divider. This serves the YouTube audience: casual viewers can watch Part 1 only and get full value; those who want linguistic depth continue to Part 2.

#### Part 1 — Accessible Layer (for general audience)

The goal: someone with zero Arabic knowledge should understand the verse's meaning, significance, and relevance.

1. **Contextual Opening** — Place the verse in its surrounding context (what came before, what comes after, how they connect). Simple language.
2. **Core Meaning** — What is this verse saying? Plain Persian, no jargon. Use everyday analogies where they naturally fit.
3. **Cross-References (simple)** — Other verses that relate, explained in plain terms: "this pattern of trading truth for small gain also appears in [2:16] where..."
4. **Pattern/Insight** — Broader patterns or takeaways. Real-life examples, stories, analogies.
5. **Personal Reflection** — Deeper personal take, open questions, things that resonate.

In this part, Arabic terms may appear but are always immediately explained in simple Persian. Root analysis is minimal — just enough to make a point (e.g., "the word شکر originally described a camel that gives abundant milk from little grazing — it's about amplifying what you receive").

#### --- (Divider)

#### Part 2 — Technical Layer (for those who want depth)

6. **Grammatical & Syntactic Analysis** — Verb forms (مضارع/ماضی), sentence structures (إنّما for حصر), pronoun references, باب analysis
7. **Detailed Root Analysis** — Deep etymological exploration woven into narrative (not dry lists). Cross-references with WHY they matter.
8. **Multiple Readings** — When a phrase has multiple possible syntactic/semantic readings, present each with a label and weigh them
9. **Structural Comparison** — Tables showing parallel structures, chiastic patterns, cause-result mappings
10. **Open Technical Questions** — Unresolved linguistic/grammatical questions flagged for future investigation

### Root/Lemma Reference Section (Separate from Note)

After the note itself, AI output should include a **standalone root/lemma reference** for all significant words in the verse. This section is NOT part of the note — it's a separate lookup aid that feeds into the KB.

```
## ریشه‌ها و لِمّاها (مستقل از نوت)

| کلمه | لِمّا | ریشه | معنی ریشه | توضیح مختصر |
|---|---|---|---|---|
| يَكْتُمُونَ | كَتَمَ | ك-ت-م | پنهان کردن، پوشاندن | اخفای آگاهانه چیزی که باید آشکار شود |
| اشْتَرَوُا | اِشْتَرَى | ش-ر-ي | خرید و فروش، مبادله | باب افتعال: خریدن (هدایت را دادند، ضلالت را گرفتند) |
| ...
```

This saves ~30 minutes of daily root lookup time. The author copies relevant entries into KB root/lemma notes.

### Cross-Reference Style

Always explain WHY the reference is relevant, not just cite it:

```
دقیقاً همین ترکیب «اکل + بطن + نار» رو توی [4:10] داریم
که دربارهٔ خوردن مال یتیمانه.
```

NOT: «همچنین [4:10] را ببینید» (too dry, no context)

### Structural Comparison Style

Uses tables for parallel structures:

| عمل                 | نتیجه          |
| ------------------- | -------------- |
| کتمان کلام خدا      | صحبت نکردن خدا |
| تجارت با کلام خدا   | پاک نکردنشون   |
| رضایت به بهای ناچیز | عذاب دردناک    |

### Multiple Readings Style

When a phrase has multiple possible readings, present each with a label:

```
**خوانش اول - تعجب:** «چه قدر شکیبایند بر آتش!» ...
**خوانش دوم - استفهام توبیخی:** «چه چیزی آنان را بر آتش صبور کرده؟» ...
**خوانش سوم - که به نظرم جالب‌تره:** با توجه به آیه [41:24] ...
```

The author often indicates which reading they find more compelling, but without dismissing others.

### Analogies Style

Real-life analogies are woven organically, not forced:

```
مثل وقتی که کسی رو می‌بینی که آروم آروم داره به سمت آتیش
راه میره و میگی «آخه چطور اینقدر خونسرده؟»
```

Sources: everyday experiences, family stories, movies, common scenarios. Never abstract philosophical analogies.

### Personal Reflection Style

Deeper reflections often appear after a divider (---) or in a distinct block:

```
اینجا ارزش داره یکم بیشتر دقت کنیم. خوانش معمولی ممکنه این باشه که
«گمراهی رو به هدایت ترجیح دادن». که نزدیکه ولی دقتی که سزاوار
خوندن قرآنه رو از دست میده...
```

### Grammatical Observations Style

Grammar notes are analytical, not academic:

```
باز کتمان کردن رو بصورت فعل مضارع داریم. کسانی که بصورت فعال، کتمان کننده‌اند.
```

```
یه فرقی هست بین أنزَلَ و نَزَّلَ. «أنزَلَ» (باب إفعال) = یکجا و یکباره فرستادن.
«نَزَّلَ» (باب تفعیل) = تدریجی و مرحله‌ای فرستادن.
```

### Connecting to Previous Verses

Often references back to earlier studied verses with updated understanding:

```
توی [2:18] هم «صُمٌّ بُكْمٌ عُمْيٌ» بود ولی نتیجه فرق می‌کنه:
لا یعقلون vs لا یرجعون... الان می‌بینم اون موقع چقدر سطحی‌تر
ترجمه و بررسی کرده بودم اون آیه رو!
```

## Formatting

- **Bold** for Arabic terms and key concepts
- _Italic_ for emphasis on specific words within a sentence
- Bullet lists for enumerations (cross-references, examples, consequences)
- Tables for structural comparisons
- Dividers (---) between major sections
- `[x:y]` format for verse cross-references (rendered as quranLink in the app)
- Heading (##) for major new topics within a note (e.g., ## رِزْق, ## شُکْر)

## Analytical Principles (from analysis-framework.md)

These principles are embedded in the notes naturally:

1. **Quran defines its own terms** — Root etymology + Quranic usage > conventional meaning
2. **Networked thinking** — Every word/concept is traced across the Quran
3. **Principle of optimality** — No word is filler; ask "why this word here?"
4. **Epistemic humility** — Every conclusion is one possible reading
5. **Grammar matters** — Verb form, sentence structure, pronoun references analyzed
6. **Process orientation** — Concepts like إسلام، کفر، ایمان are ongoing processes, not static labels

## What Makes a Good Draft vs. a Bad Draft

### Good Draft Characteristics

- **Part 1 is self-contained**: A viewer who only reads Part 1 gets the full meaning and significance
- Part 1 uses no unexplained Arabic jargon — every term is immediately clarified in simple Persian
- Everyday analogies appear in Part 1, not buried in the technical section
- Opens with context (what came before this verse)
- Part 2 weaves root analysis into narrative naturally (not dry lists)
- Cross-references always explain WHY they matter
- Presents multiple readings when the text allows (Part 2)
- Includes a standalone root/lemma reference table after the note
- Feels like someone thinking out loud, not lecturing

### Bad Draft Characteristics

- Starts with «این آیه درباره ... است» (too academic)
- Mixes technical Arabic grammar into Part 1 (loses general audience)
- Part 1 requires Arabic knowledge to follow
- Lists root meanings without connecting to verse context
- Cross-references without explaining why they matter
- Claims certainty about interpretation
- Uses formal/stiff language
- Treats the verse in isolation from surrounding verses
- Sounds like a textbook, not a person exploring
- Root/lemma reference missing or mixed into the note text
