# Quran Analysis Framework

> This is the authoritative document for the Quran analysis framework.

The Quran describes itself as precise (11:1), consistent (39:23), and free of contradiction (4:82). This framework takes those claims seriously as a starting assumption and tries to read the text on those terms: carefully, honestly, and without importing external meanings when the text provides its own. It is not a school of thought or a source of religious authority. It's how one person tries to engage with the text.

## Part I: How We Read the Text

### 1. Definition Source Hierarchy

The Quran's own contextual usage and root etymology take precedence over conventional or theological definitions. No two words are exact synonyms, and subtle differences (e.g., katm/kufr, khashya/khawf, siraat/sabeel/tareeq) must be extracted from the text itself. Root etymology, historical usage (pre-Islamic poetry, early Arabic prose), and dictionaries are all valuable as raw linguistic data. They tell us what words actually meant when the text arrived. But their interpretive layers (where a specific use-case has settled as "the" meaning) should be treated with caution.

A root can branch in many directions. The root k-t-b connects "writing," "book," "army," and "obligation." The root alone doesn't tell us which meaning is active. Historical usage grounds the root in reality: how did the people who first heard this text understand this word? That historical data is not an external interpretation imposed on the Quran. It's the linguistic soil the Quran was planted in. We use it the same way we use root data: as raw input, not as a final answer.

#### Definition Patterns in the Quran

1. **Explicit definition with "alladhina" (those who):** e.g., sabireen -> "those who, when disaster strikes them, say: Indeed we belong to God..."
2. **Restriction with "innama" (only/indeed):** Precise confinement of a concept to specific attributes
3. **Attribute lists:** e.g., "Successful indeed are the believers _ those who in their prayer are humble _ ..."
4. **Contrastive definition:** "It is not... but rather..." Negating a wrong definition + presenting the correct one
5. **Operational example:** Extracting definitions from character behavior in narratives
6. **Condition-result:** "Whoever... then indeed..." Defining membership criteria for a category
7. **Contextual usage extraction:** Sometimes the meaning of a word can be inferred from how it has been used in its surrounding verses. If we can find enough evidence across the text that a word is consistently used in a particular sense, that usage becomes a valid basis for its definition.

#### Workflow

- **Pre-check:** Verify grammatical structure and syntax (Section 5)
- **First:** Search for internal definitions (using Networked Thinking, Section 2)
- **Second:** Examine the etymological root and historical usage
- **Third:** Compare with conventional/theological definitions and classical commentaries (Section 12)

> **Rule:** No conventional or theological definition can take precedence over the Quran's own contextual usage combined with root etymology and historical linguistic data.

### 2. Networked Thinking

The Quran was revealed over roughly 23 years, but it reads like a single painting. Each verse is a brush stroke: it has its own color and direction, but it was placed to serve the whole picture. A word used in one surah might get defined in another, qualified in a third, and demonstrated through a story in a fourth.

In practice, this means whenever we encounter a word or concept, we search for every other place in the Quran where it appears. How is it used there? What surrounds it? Does another verse add a condition, an exception, or an example?

### 3. Principle of Optimality

Every word in the text is there for a reason. Nothing is filler. If a word seems redundant or a qualifier seems unnecessary, that's worth investigating. "Why is this here?" and "what am I missing?" are both good starting questions.

This does not mean that a word must carry the same meaning everywhere. A word's meaning is the result of its root plus the specific context it appears in.

### 4. Speaker Layer Identification

The Quran doesn't always announce who is speaking. Paying attention to who is speaking, and to whom, changes how we read the verse. Shifts in pronouns, tone, or perspective are all signals.

### 5. Grammar and Syntax Check

Before analyzing what a verse means, verify the structural level. This includes identifying verb forms, distinguishing particles, tracking pronoun references, and understanding sentence structure. These are matters of language mechanics, not interpretation.

## Part II: How We Analyze What We Read

### 6. Behavioral Analysis

When analyzing characters in Quranic narratives, treat their behavior like a black box: describe what a character did, not why we think they did it. Unless the text explicitly names an internal state.

### 7. Situation Simulation

When a character makes a decision, try to put ourselves in their position without judging them. This builds empathy and self-awareness.

### 8. Process Orientation

Many Quranic concepts that we tend to treat as labels are actually describing ongoing processes. Being a Muslim is not a status someone achieves once — the word itself means "one who submits," and submitting is something that happens continuously.

### 9. Generalizable Patterns

The stories contain patterns that repeat across time and context. Part of this framework is actively looking for those patterns.

## Part III: What We Take With Us

### 10. Vernacular Mapping

Drawing parallels with daily life experiences. The best analogies come from experiences anyone can relate to. An analogy has to be a genuine structural match, not a loose comparison.

> **Rule:** Oversimplification that strips away the transcendent dimension is worse than no metaphor at all.

## Part IV: Guiding Principles

### 11. Principle of Uncertainty

Any conclusion is one possible reading among many. We say "it seems" or "my reading is" not as a formality, but because we mean it.

### 12. Classical Review

After going through the steps above, look at what traditional commentaries have said. Not as a starting point, but as a check.

## Relevance to the Tool

The NodeReader should support this framework, but **not enforce its linear ordering**. The [actual workflow](study-workflow.md) is a spiral. The tool's job is to make the data available when the user needs it, not to dictate the sequence.

Key tool-relevant sections:

- **Section 1 (Definition Hierarchy)**: Needs root data, lemma data, and cross-references
- **Section 2 (Networked Thinking)**: Needs cross-reference search with context (the biggest current gap)
- **Section 5 (Grammar Check)**: Not currently supported by the tool
- **Section 12 (Classical Review)**: Supported via Prompt Builder (user copies study context to external AI)
