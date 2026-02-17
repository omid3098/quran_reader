# Sample Note Patterns

> Extracted from real study notes on verses 2:169, 2:170, 2:171.
> These patterns show how the user actually works, which informs tool design.

## Common Patterns in Notes

### 1. Word Deep-Dive

The user picks a word, explores its root, and builds understanding:

> **سُّوء:** ریشه س-و-أ یه حس آسیب‌رسانی، زشتی یا ضرر داره.
> **فَحْشَاء:** از ریشه ف-ح-ش، که نشون‌دهنده زیاده‌روی، تجاوز از حد.

**Tool implication:** Root and lemma notes need to be quickly accessible and editable during study.

### 2. Manual Cross-Referencing

The user manually finds and lists where a word/concept appears elsewhere:

> - زنا: «إِنَّهُ كَانَ فَاحِشَةً» (17:32)
> - عمل قوم لوط: «أَتَأْتُونَ الْفَاحِشَةَ» (7:80)
> - نکاح با محارم: «إِنَّهُ كَانَ فَاحِشَةً وَمَقْتًا» (4:22)

**Tool implication:** This is the biggest gap. The tool should surface these cross-references with context, not just verse keys.

### 3. Conceptual Models

The user builds mental models to explain relationships:

> تصویرسازی: سوء مجموعه‌ای از بدی‌هاست. بالای این مجموعه یه خطی (threshold) داریم. فحشا عنصرهایی که از این آستانه بالاتر رفتن.

**Tool implication:** The KB `patterns` field was designed for this. Not yet implemented.

### 4. Grammatical Observations

> استفاده از إنّما به معنی «فقط». يَأْمُرُكُمْ فعل مضارعی — عمل مداوم و پیوسته.
> وَأَن تَقُولُوا ساختار متفاوت — جمله فعل‌دار، نه اسم ساده مثل دو تای اول.

**Tool implication:** Grammar analysis not currently supported. Could be a future feature.

### 5. Real-Life Analogies

> داستان سوسیس: مامان‌بزرگ‌بزرگه ماهیتابه‌ش کوچیک بوده...
> فیلم فروشنده: «یه آدم چجوری گاو میشه؟» «به مرور.»

**Tool implication:** These belong in narrative notes (BlockNote per-verse), not in structured KB.

### 6. Inter-Verse Connections with Reasoning

> توی 2:18 هم «صُمٌّ بُكْمٌ عُمْيٌ» بود ولی نتیجه فرق می‌کنه: لا یعقلون vs لا یرجعون
> 7:179 هم خیلی واضح‌تر بیان می‌کنه: اندام‌ها سالمن ولی مشکل توی به کار بستن.

**Tool implication:** The `connections` array in KB captures exactly this: from-verse, to-verse, reason. Enables backlinks.

### 7. Personal Reflection

> هر سری به «نقل قول کردن چیزی که نمی‌دونیم از طرف خدا» می‌رسیم، تن و بدن من می‌لرزه...

**Tool implication:** This is deeply personal. Stays in narrative notes. The tool shouldn't try to structure this.

## Summary: What Belongs Where

| Pattern                      | Where in the tool                     |
| ---------------------------- | ------------------------------------- |
| Root/lemma definitions       | KB: `roots`, `lemmas`                 |
| Cross-references with reason | KB: `connections` (enables backlinks) |
| Conceptual models            | KB: `patterns`                        |
| Grammatical observations     | Narrative note (BlockNote per-verse)  |
| Real-life analogies          | Narrative note (BlockNote per-verse)  |
| Personal reflections         | Narrative note (BlockNote per-verse)  |
| Inter-verse thematic links   | KB: `connections`                     |
