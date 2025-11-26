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
});
