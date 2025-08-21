-- CreateTable
CREATE TABLE "surah" (
    "number" INTEGER NOT NULL,
    "name_ar" TEXT NOT NULL,

    CONSTRAINT "surah_pkey" PRIMARY KEY ("number")
);

-- CreateTable
CREATE TABLE "verse" (
    "surah" INTEGER NOT NULL,
    "ayah" INTEGER NOT NULL,
    "text_ar_simple" TEXT NOT NULL,
    "bismillah" TEXT,

    CONSTRAINT "verse_pkey" PRIMARY KEY ("surah","ayah")
);

-- CreateTable
CREATE TABLE "translation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "translator" TEXT,
    "source" TEXT,
    "lastUpdate" TIMESTAMP(3),
    "verseCount" INTEGER,

    CONSTRAINT "translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verse_translation" (
    "surah" INTEGER NOT NULL,
    "ayah" INTEGER NOT NULL,
    "translationId" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "verse_translation_pkey" PRIMARY KEY ("surah","ayah","translationId")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_prefs" (
    "userId" TEXT NOT NULL,
    "defaultTranslations" TEXT[],
    "theme" TEXT,
    "fontSize" TEXT,

    CONSTRAINT "user_prefs_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "surah" INTEGER NOT NULL,
    "ayah" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "surah" INTEGER NOT NULL,
    "ayah" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "surah" INTEGER NOT NULL,
    "ayah" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verse_surah_ayah_idx" ON "verse"("surah", "ayah");

-- CreateIndex
CREATE INDEX "verse_translation_translationId_idx" ON "verse_translation"("translationId");

-- CreateIndex
CREATE INDEX "verse_translation_surah_ayah_idx" ON "verse_translation"("surah", "ayah");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "note_userId_idx" ON "note"("userId");

-- CreateIndex
CREATE INDEX "note_surah_ayah_idx" ON "note"("surah", "ayah");

-- CreateIndex
CREATE INDEX "bookmark_userId_idx" ON "bookmark"("userId");

-- CreateIndex
CREATE INDEX "bookmark_surah_ayah_idx" ON "bookmark"("surah", "ayah");

-- CreateIndex
CREATE INDEX "reading_progress_userId_idx" ON "reading_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "reading_progress_userId_surah_key" ON "reading_progress"("userId", "surah");

-- AddForeignKey
ALTER TABLE "verse" ADD CONSTRAINT "verse_surah_fkey" FOREIGN KEY ("surah") REFERENCES "surah"("number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verse_translation" ADD CONSTRAINT "verse_translation_surah_ayah_fkey" FOREIGN KEY ("surah", "ayah") REFERENCES "verse"("surah", "ayah") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verse_translation" ADD CONSTRAINT "verse_translation_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "translation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_prefs" ADD CONSTRAINT "user_prefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note" ADD CONSTRAINT "note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
