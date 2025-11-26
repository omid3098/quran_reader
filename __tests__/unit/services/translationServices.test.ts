import { describe, it, expect } from "vitest";
import {
  TRANSLATION_SERVICES,
  getServicesForLanguage,
  type TranslationService,
} from "@/services/translationServices";

describe("translationServices", () => {
  describe("TRANSLATION_SERVICES", () => {
    it("should contain abadis service", () => {
      const abadis = TRANSLATION_SERVICES.find((s) => s.id === "abadis");
      expect(abadis).toBeDefined();
      expect(abadis?.name).toBe("Abadis");
    });

    it("should have abadis as the first service in the registry", () => {
      expect(TRANSLATION_SERVICES[0].id).toBe("abadis");
    });

    it("should contain vajehyab service", () => {
      const vajehyab = TRANSLATION_SERVICES.find((s) => s.id === "vajehyab");
      expect(vajehyab).toBeDefined();
      expect(vajehyab?.name).toBe("Vajehyab");
    });

    it("should contain almaany service", () => {
      const almaany = TRANSLATION_SERVICES.find((s) => s.id === "almaany");
      expect(almaany).toBeDefined();
      expect(almaany?.name).toBe("Almaany");
    });

    it("should contain google translate service", () => {
      const google = TRANSLATION_SERVICES.find((s) => s.id === "google");
      expect(google).toBeDefined();
      expect(google?.name).toBe("Google Translate");
    });
  });

  describe("getServicesForLanguage", () => {
    it("should return abadis only for Persian (fa)", () => {
      const faServices = getServicesForLanguage("fa");
      const serviceIds = faServices.map((s) => s.id);
      expect(serviceIds).toContain("abadis");

      const enServices = getServicesForLanguage("en");
      const enServiceIds = enServices.map((s) => s.id);
      expect(enServiceIds).not.toContain("abadis");
    });

    it("should return abadis as the first service for Persian users", () => {
      const services = getServicesForLanguage("fa");
      expect(services[0].id).toBe("abadis");
    });

    it("should return vajehyab and google for Persian (fa)", () => {
      const services = getServicesForLanguage("fa");
      const serviceIds = services.map((s) => s.id);
      expect(serviceIds).toContain("vajehyab");
      expect(serviceIds).toContain("google");
    });

    it("should NOT return vajehyab for English (en)", () => {
      const services = getServicesForLanguage("en");
      const serviceIds = services.map((s) => s.id);
      expect(serviceIds).not.toContain("vajehyab");
    });

    it("should return google translate for any language", () => {
      expect(getServicesForLanguage("en").map((s) => s.id)).toContain("google");
      expect(getServicesForLanguage("fa").map((s) => s.id)).toContain("google");
      expect(getServicesForLanguage("ar").map((s) => s.id)).toContain("google");
      expect(getServicesForLanguage("fr").map((s) => s.id)).toContain("google");
    });

    it("should return almaany for supported languages", () => {
      // Almaany translates Arabic to these languages
      const enServices = getServicesForLanguage("en");
      const faServices = getServicesForLanguage("fa");

      expect(enServices.map((s) => s.id)).toContain("almaany");
      expect(faServices.map((s) => s.id)).toContain("almaany");
    });
  });

  describe("URL generation", () => {
    it("should generate correct abadis URL", () => {
      const abadis = TRANSLATION_SERVICES.find((s) => s.id === "abadis") as TranslationService;
      const url = abadis.getUrl("كتاب", "fa");
      expect(url).toBe("https://abadis.ir/fatofa/%D9%83%D8%AA%D8%A7%D8%A8");
    });

    it("should encode Arabic characters with diacritics in abadis URL", () => {
      const abadis = TRANSLATION_SERVICES.find((s) => s.id === "abadis") as TranslationService;
      const url = abadis.getUrl("الْكِتَابِ", "fa");
      expect(url).toContain("abadis.ir/fatofa/");
      expect(url).toContain(encodeURIComponent("الْكِتَابِ"));
    });

    it("should generate correct vajehyab URL", () => {
      const vajehyab = TRANSLATION_SERVICES.find((s) => s.id === "vajehyab") as TranslationService;
      const url = vajehyab.getUrl("كتاب", "fa");
      expect(url).toContain("vajehyab.com");
      expect(url).toContain(encodeURIComponent("كتاب"));
    });

    it("should generate correct almaany URL", () => {
      const almaany = TRANSLATION_SERVICES.find((s) => s.id === "almaany") as TranslationService;
      const url = almaany.getUrl("كتاب", "en");
      expect(url).toContain("almaany.com");
      expect(url).toContain(encodeURIComponent("كتاب"));
    });

    it("should generate correct google translate URL", () => {
      const google = TRANSLATION_SERVICES.find((s) => s.id === "google") as TranslationService;
      const url = google.getUrl("كتاب", "en");
      expect(url).toContain("translate.google.com");
      expect(url).toContain("sl=ar"); // source language Arabic
      expect(url).toContain("tl=en"); // target language English
    });

    it("should generate google translate URL with correct target language", () => {
      const google = TRANSLATION_SERVICES.find((s) => s.id === "google") as TranslationService;

      const urlFa = google.getUrl("كتاب", "fa");
      expect(urlFa).toContain("tl=fa");

      const urlEn = google.getUrl("كتاب", "en");
      expect(urlEn).toContain("tl=en");
    });
  });

  describe("iframe support", () => {
    it("should indicate which services support iframe embedding", () => {
      // Each service should have supportsIframe defined
      TRANSLATION_SERVICES.forEach((service) => {
        expect(typeof service.supportsIframe).toBe("boolean");
      });
    });

    it("abadis should not support iframe", () => {
      const abadis = TRANSLATION_SERVICES.find((s) => s.id === "abadis");
      expect(abadis?.supportsIframe).toBe(false);
    });

    it("all current services should not support iframe", () => {
      // All services block iframe embedding
      const vajehyab = TRANSLATION_SERVICES.find((s) => s.id === "vajehyab");
      const almaany = TRANSLATION_SERVICES.find((s) => s.id === "almaany");
      const google = TRANSLATION_SERVICES.find((s) => s.id === "google");

      expect(vajehyab?.supportsIframe).toBe(false);
      expect(almaany?.supportsIframe).toBe(false);
      expect(google?.supportsIframe).toBe(false);
    });
  });

  describe("Wiki Ahlolbait Service", () => {
    const wiki = TRANSLATION_SERVICES.find((s) => s.id === "wiki_ahlolbait");

    it("should be registered in service list", () => {
      expect(wiki).toBeDefined();
      expect(wiki?.name).toBe("Wiki Ahlolbait");
      expect(wiki?.supportsIframe).toBe(false);
    });

    it("should support Persian and English", () => {
      expect(wiki?.supportedTargetLanguages).toContain("fa");
      expect(wiki?.supportedTargetLanguages).toContain("en");
    });

    describe("URL generation", () => {
      it("should generate correct URL for Al-Fatiha 1:1", () => {
        const url = wiki!.getUrl("بسم", "fa", "1:1");
        expect(url).toBe("https://wiki.ahlolbait.com/آیه_1_سوره_فاتحه");
      });

      it("should generate correct URL for Ayat al-Kursi 2:255", () => {
        const url = wiki!.getUrl("الله", "fa", "2:255");
        expect(url).toBe("https://wiki.ahlolbait.com/آیه_255_سوره_بقره");
      });

      it("should generate correct URL for multi-word surah name (Al Imran)", () => {
        const url = wiki!.getUrl("الله", "fa", "3:1");
        expect(url).toBe("https://wiki.ahlolbait.com/آیه_1_سوره_آل_عمران");
      });

      it("should generate correct URL for last surah (An-Nas)", () => {
        const url = wiki!.getUrl("قل", "fa", "114:1");
        expect(url).toBe("https://wiki.ahlolbait.com/آیه_1_سوره_ناس");
      });

      it("should work for both fa and en target languages", () => {
        const urlFa = wiki!.getUrl("الله", "fa", "2:255");
        const urlEn = wiki!.getUrl("الله", "en", "2:255");
        expect(urlFa).toBe(urlEn);
      });
    });

    describe("Edge cases", () => {
      it("should return fallback URL when verseKey is undefined", () => {
        expect(wiki!.getUrl("كتاب", "fa", undefined)).toBe("https://wiki.ahlolbait.com/");
      });

      it("should return fallback URL when verseKey is empty", () => {
        expect(wiki!.getUrl("كتاب", "fa", "")).toBe("https://wiki.ahlolbait.com/");
      });

      it("should return fallback URL for invalid format", () => {
        expect(wiki!.getUrl("كتاب", "fa", "invalid")).toBe("https://wiki.ahlolbait.com/");
      });

      it("should return fallback URL for out-of-range surah (0)", () => {
        expect(wiki!.getUrl("كتاب", "fa", "0:1")).toBe("https://wiki.ahlolbait.com/");
      });

      it("should return fallback URL for out-of-range surah (115)", () => {
        expect(wiki!.getUrl("كتاب", "fa", "115:1")).toBe("https://wiki.ahlolbait.com/");
      });

      it("should return fallback URL for negative ayah number", () => {
        expect(wiki!.getUrl("كتاب", "fa", "2:0")).toBe("https://wiki.ahlolbait.com/");
      });
    });
  });

  describe("getServicesForLanguage with wiki_ahlolbait", () => {
    it("should include wiki_ahlolbait for Persian users", () => {
      const services = getServicesForLanguage("fa");
      expect(services.map((s) => s.id)).toContain("wiki_ahlolbait");
    });

    it("should include wiki_ahlolbait for English users", () => {
      const services = getServicesForLanguage("en");
      expect(services.map((s) => s.id)).toContain("wiki_ahlolbait");
    });

    it("should NOT include wiki_ahlolbait for other languages", () => {
      const services = getServicesForLanguage("ar");
      expect(services.map((s) => s.id)).not.toContain("wiki_ahlolbait");
    });
  });

  describe("Backward compatibility", () => {
    it("should allow existing services to work with optional verseKey", () => {
      const abadis = TRANSLATION_SERVICES.find((s) => s.id === "abadis")!;
      const url = abadis.getUrl("كتاب", "fa", "2:255");
      expect(url).toContain("abadis.ir/fatofa/");
    });
  });
});
