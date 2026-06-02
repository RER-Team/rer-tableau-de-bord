/**
 * Helpers HTML partagés par les explorateurs d'articles et les panneaux d'édition.
 *
 * Ces fonctions s'appuient sur `DOMParser` et ne sont donc utilisables que côté
 * client. Elles dégradent proprement (retour de l'entrée telle quelle) lorsque
 * `window` est indisponible.
 */

/**
 * Remplace les blocs `figure.embed-block` contenant une URL (YouTube,
 * Datawrapper) par une iframe responsive prête à l'affichage.
 */
export function transformEmbeds(html: string): string {
  if (typeof window === "undefined" || !html) return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const blocks = doc.querySelectorAll("figure.embed-block .embed-url");
    blocks.forEach((p) => {
      const figure = p.closest("figure.embed-block");
      if (!figure) return;
      const raw = p.textContent ?? "";
      const url = raw.trim();
      if (!url) return;

      let iframeSrc: string | null = null;
      let title = "Contenu embarqué";

      try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();

        // YouTube
        if (host.includes("youtube.com") || host === "youtu.be") {
          let videoId = "";
          if (host === "youtu.be") {
            videoId = parsed.pathname.replace("/", "").split(/[/?#&]/)[0] ?? "";
          } else {
            videoId =
              parsed.searchParams.get("v") ||
              parsed.pathname.split("/").filter(Boolean).pop() ||
              "";
          }
          if (videoId) {
            iframeSrc = `https://www.youtube.com/embed/${videoId}`;
            title = "Vidéo YouTube";
          }
        }

        // Datawrapper
        if (!iframeSrc && host.includes("datawrapper.dwcdn.net")) {
          const parts = parsed.pathname.split("/").filter(Boolean);
          const slug = parts.slice(0, 2).join("/") || "";
          if (slug) {
            iframeSrc = `https://datawrapper.dwcdn.net/${slug}/`;
            title = "Graphique Datawrapper";
          }
        }
      } catch {
        // URL invalide : on laisse tel quel
      }

      if (!iframeSrc) {
        return;
      }

      figure.innerHTML = `
<div class="embed-responsive">
  <iframe src="${iframeSrc}" title="${title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
</div>
`.trim();
    });

    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

/**
 * Sépare le chapô (premier paragraphe ou `p.chapo`) du corps de l'article.
 * Si `allowChapo` est faux, retire toute classe `chapo` et renvoie un chapô nul.
 *
 * @param fallbackChapo Chapô retourné si l'analyse DOM échoue.
 */
export function extractChapoAndBody(
  html: string,
  allowChapo: boolean,
  fallbackChapo: string | null = null
): { chapo: string | null; body: string } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if (!allowChapo) {
      doc.querySelectorAll("p.chapo").forEach((node) => {
        node.classList.remove("chapo");
        if (!node.getAttribute("class")?.trim()) {
          node.removeAttribute("class");
        }
      });
      const bodyHtml = doc.body.innerHTML.trim();
      return { chapo: null, body: bodyHtml };
    }
    let chapoText: string | null = null;
    const chapoEl = doc.querySelector("p.chapo") ?? doc.querySelector("p");
    if (chapoEl) {
      chapoText = (chapoEl.textContent ?? "").trim() || null;
      chapoEl.remove();
    }
    const bodyHtml = doc.body.innerHTML.trim();
    return { chapo: chapoText, body: bodyHtml };
  } catch {
    return { chapo: fallbackChapo, body: html };
  }
}

/**
 * Reconstruit le HTML initial d'un article à partir de son chapô et de son
 * contenu (le chapô est ré-encapsulé dans un `<p class="chapo">`).
 */
export function buildInitialHtml(
  source: { chapo: string | null; contenu: string | null } | null | undefined
): string {
  if (!source) return "";
  const chapoHtml = source.chapo ? `<p class="chapo">${source.chapo}</p>` : "";
  return `${chapoHtml}${source.contenu ?? ""}`;
}
