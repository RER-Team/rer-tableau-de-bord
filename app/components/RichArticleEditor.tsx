"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { ingestDebug } from "@/lib/ingest-debug";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Paragraph from "@tiptap/extension-paragraph";
import Image from "@tiptap/extension-image";
type UploadResponse = {
  path: string;
  token: string;
  key: string;
  publicUrl: string | null;
};

type RichArticleEditorProps = {
  /**
   * Contenu initial au format JSON Tiptap (recommandé).
   */
  initialJson?: unknown;
  /**
   * Contenu initial au format HTML (fallback / compatibilité).
   */
  initialHtml?: string | null;
  /**
   * Identifiant d’article (facultatif, pour ranger les images par article).
   */
  articleId?: string;
  /**
   * Mode lecture seule.
   */
  readOnly?: boolean;
  /**
   * Callback appelé à chaque mise à jour significative.
   */
  onChange?: (payload: { json: unknown; html: string }) => void;
  /**
   * Classes supplémentaires pour le conteneur externe.
   */
  className?: string;
  /**
   * Affichage du "chrome" (carte, bordure, padding).
   * - default: carte blanche intégrée (comportement historique)
   * - none: rendu nu, utile si le parent fournit déjà la carte
   */
  chrome?: "default" | "none";
  /**
   * Active la normalisation automatique du premier paragraphe en chapô.
   */
  hasChapo?: boolean;
};

export function RichArticleEditor({
  initialJson,
  initialHtml,
  articleId,
  readOnly = false,
  onChange,
  className = "",
  chrome = "default",
  hasChapo = true,
}: RichArticleEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isNormalizingRef = useRef(false);
  const hasChapoRef = useRef(hasChapo);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    hasChapoRef.current = hasChapo;
  }, [hasChapo]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      Paragraph.extend({
        addAttributes() {
          return {
            ...(this.parent?.() || {}),
            class: {
              default: null,
              parseHTML: (element) => element.getAttribute("class"),
              renderHTML: (attributes) => {
                if (!attributes.class) return {};
                return { class: attributes.class };
              },
            },
          };
        },
      }),
      StarterKit.configure({
        paragraph: false,
        heading: {
          levels: [2, 3],
        },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
      }),
      Image.extend({
        addAttributes() {
          return {
            ...(this.parent?.() || {}),
            class: {
              default: null,
              parseHTML: (element) => element.getAttribute("class"),
              renderHTML: (attributes) => {
                if (!attributes.class) return {};
                return { class: attributes.class };
              },
            },
          };
        },
      }),
    ],
    content: initialJson ?? initialHtml ?? "",
    editable: !readOnly,
    autofocus: false,
    // Important pour Next.js / SSR : éviter les divergences de rendu
    // entre serveur et client comme recommandé par Tiptap.
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (!onChangeRef.current) return;

      if (!readOnly) {
        const { doc, schema } = editor.state;
        const inserts: number[] = [];
        const chapoRemovals: { pos: number; node: any }[] = [];
        let firstParagraphPos: number | null = null;
        let firstParagraphNode: any = null;
        let firstParagraphHasChapo = false;

        doc.descendants((node, pos) => {
          // Normalisation légende d'image
          if (node.type.name === "image") {
            const classAttr = (node.attrs as any)?.class as string | null | undefined;
            const hasArticleImageClass = (classAttr ?? "")
              .split(" ")
              .map((c) => c.trim())
              .filter(Boolean)
              .includes("article-image");
            if (!hasArticleImageClass) return;

            const afterPos = pos + node.nodeSize;
            const afterNode = doc.nodeAt(afterPos);
            const afterClass = (afterNode?.attrs as any)?.class as string | null | undefined;
            const afterHasCaptionClass = (afterClass ?? "")
              .split(" ")
              .map((c) => c.trim())
              .filter(Boolean)
              .includes("image-caption");

            if (!afterNode || afterNode.type.name !== "paragraph" || !afterHasCaptionClass) {
              inserts.push(afterPos);
            }
            return;
          }

          // Repérage des paragraphes / chapô
          if (node.type.name === "paragraph") {
            if (firstParagraphPos === null) {
              firstParagraphPos = pos;
              firstParagraphNode = node;
            }
            const classAttr = (node.attrs as any)?.class as string | null | undefined;
            const classes = (classAttr ?? "")
              .split(" ")
              .map((c) => c.trim())
              .filter(Boolean);
            const isChapo = classes.includes("chapo");

            if (isChapo) {
              if (!hasChapoRef.current) {
                chapoRemovals.push({ pos, node });
              } else if (firstParagraphPos === pos) {
                firstParagraphHasChapo = true;
              } else {
                chapoRemovals.push({ pos, node });
              }
            }
          }
        });

        if (!isNormalizingRef.current) {
          const tr = editor.state.tr;

          // Insérer les légendes manquantes
          for (let i = inserts.length - 1; i >= 0; i--) {
            tr.insert(
              inserts[i],
              schema.nodes.paragraph.create({ class: "image-caption" })
            );
          }

          // Si aucun paragraphe n'a de chapô, on applique sur le premier
          if (
            hasChapoRef.current &&
            firstParagraphPos !== null &&
            firstParagraphNode &&
            !firstParagraphHasChapo
          ) {
            const existingClass: string =
              ((firstParagraphNode.attrs as any)?.class as string | null | undefined) || "";
            const classes = existingClass
              .split(" ")
              .map((c) => c.trim())
              .filter(Boolean);
            if (!classes.includes("chapo")) {
              const nextClasses = [...classes, "chapo"];
              tr.setNodeMarkup(firstParagraphPos, undefined, {
                ...(firstParagraphNode.attrs as any),
                class: nextClasses.join(" "),
              });
            }
          }

          // On retire "chapo" des paragraphes non conformes (ou de tous si chapô désactivé)
          for (const { pos, node } of chapoRemovals) {
            const classAttr = (node.attrs as any)?.class as string | null | undefined;
            const classes = (classAttr ?? "")
              .split(" ")
              .map((c) => c.trim())
              .filter(Boolean)
              .filter((c) => c !== "chapo");
            tr.setNodeMarkup(pos, undefined, {
              ...(node.attrs as any),
              class: classes.join(" "),
            });
          }

          if (tr.steps.length > 0) {
            isNormalizingRef.current = true;
            editor.view.dispatch(tr);
            return;
          }
        }

        if (isNormalizingRef.current) {
          isNormalizingRef.current = false;
        }
      }
      const json = editor.getJSON();
      const html = editor.getHTML();

      ingestDebug({
        sessionId: "fb943b",
        runId: "pre-fix",
        hypothesisId: "H_AUTOSAVE_OR_ONCHANGE",
        location: "app/components/RichArticleEditor.tsx:onUpdate",
        message: "RichArticleEditor onUpdate called",
        data: { htmlLength: html.length },
      });

      // #region agent log
      ingestDebug({
        sessionId: "a34272",
        runId: "pre-fix",
        hypothesisId: "H_IMG_SCHEMA",
        location: "app/components/RichArticleEditor.tsx:onUpdate",
        message: "RichArticleEditor onUpdate snapshot",
        data: {
          htmlLength: html.length,
          hasImgTag: html.includes("<img"),
          hasFigureTag: html.includes("<figure"),
        },
      });
      // #endregion

      onChangeRef.current({ json, html });
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || readOnly) return;

    const { doc } = editor.state;
    let firstParagraphPos: number | null = null;
    let firstParagraphNode: any = null;
    const chapoRemovals: { pos: number; node: any }[] = [];
    let firstParagraphHasChapo = false;

    doc.descendants((node, pos) => {
      if (node.type.name !== "paragraph") return;
      if (firstParagraphPos === null) {
        firstParagraphPos = pos;
        firstParagraphNode = node;
      }
      const classAttr = (node.attrs as any)?.class as string | null | undefined;
      const classes = (classAttr ?? "")
        .split(" ")
        .map((c) => c.trim())
        .filter(Boolean);
      const isChapo = classes.includes("chapo");
      if (!isChapo) return;

      if (!hasChapo) {
        chapoRemovals.push({ pos, node });
      } else if (firstParagraphPos === pos) {
        firstParagraphHasChapo = true;
      } else {
        chapoRemovals.push({ pos, node });
      }
    });

    const tr = editor.state.tr;

    if (hasChapo && firstParagraphPos !== null && firstParagraphNode && !firstParagraphHasChapo) {
      const existingClass: string =
        ((firstParagraphNode.attrs as any)?.class as string | null | undefined) || "";
      const classes = existingClass
        .split(" ")
        .map((c) => c.trim())
        .filter(Boolean);
      tr.setNodeMarkup(firstParagraphPos, undefined, {
        ...(firstParagraphNode.attrs as any),
        class: [...classes, "chapo"].join(" "),
      });
    }

    for (const { pos, node } of chapoRemovals) {
      const classAttr = (node.attrs as any)?.class as string | null | undefined;
      const classes = (classAttr ?? "")
        .split(" ")
        .map((c) => c.trim())
        .filter(Boolean)
        .filter((c) => c !== "chapo");
      tr.setNodeMarkup(pos, undefined, {
        ...(node.attrs as any),
        class: classes.join(" "),
      });
    }

    if (tr.steps.length > 0) {
      editor.view.dispatch(tr);
    }
  }, [editor, hasChapo, readOnly]);

  if (!editor || (editor as any).isDestroyed) return null;

  const baseButtonClasses =
    "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors";
  const activeButtonClasses =
    "border-rer-blue/40 bg-rer-blue/10 text-rer-blue";
  const idleButtonClasses =
    "border-rer-border bg-white text-rer-text hover:bg-rer-app";

  const insertBlockAtSlash = (html: string) => {
    if (!editor) return;
    const { state } = editor;
    const { from } = state.selection;
    editor
      .chain()
      .focus()
      // On supprime le « / » de déclenchement juste avant le curseur
      .deleteRange({ from: Math.max(from - 1, 0), to: from })
      .insertContent(html)
      .run();
  };

  const applyHeadingFromSlash = (level: 2 | 3) => {
    if (!editor) return;
    const { state } = editor;
    const { from } = state.selection;
    editor
      .chain()
      .focus()
      .deleteRange({ from: Math.max(from - 1, 0), to: from })
      .toggleHeading({ level })
      .run();
  };

  const applyBlockquoteFromSlash = () => {
    if (!editor) return;
    const { state } = editor;
    const { from } = state.selection;
    editor
      .chain()
      .focus()
      .deleteRange({ from: Math.max(from - 1, 0), to: from })
      .toggleBlockquote()
      .run();
  };

  const handleInsertImage = () => {
    if (!editor) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;

    try {
      // #region agent log
      ingestDebug({
        sessionId: "a34272",
        runId: "pre-fix",
        hypothesisId: "H_IMG_UPLOAD_FLOW",
        location: "app/components/RichArticleEditor.tsx:handleFileChange:start",
        message: "handleFileChange called",
        data: {
          fileName: file.name,
          fileSize: file.size,
          articleId: articleId ?? null,
        },
      });
      // #endregion

      const { uploadArticleImage } = await import("@/lib/uploadArticleImage");
      const { publicUrl } = await uploadArticleImage({
        file,
        filename: file.name,
        articleId: articleId ?? null,
      });

      // #region agent log
      ingestDebug({
        sessionId: "a34272",
        runId: "pre-fix",
        hypothesisId: "H_IMG_UPLOAD_FLOW",
        location:
          "app/components/RichArticleEditor.tsx:handleFileChange:beforeInsert",
        message: "Inserting image into editor",
        data: {
          hasImgUrl: !!publicUrl,
          imgUrlLength: publicUrl.length,
        },
      });
      // #endregion

      editor
        .chain()
        .focus()
        .insertContent(
          `<img src="${publicUrl}" alt="" class="article-image" /><p class="image-caption"></p>`
        )
        .run();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Erreur lors du traitement de l’image.";
      alert(message);
    }
  };

  const handleInsertSocialPost = () => {
    insertBlockAtSlash(
      `<section class="social-post"><div class="social-post-label">POST RÉSEAUX SOCIAUX</div><p>Texte du post réseaux sociaux…</p></section>`
    );
  };

  const handleInsertEmbed = () => {
    if (!editor) return;
    const input = window.prompt("URL ou code d’embed (iframe)…") ?? "";
    const safeValue = input.trim();
    if (!safeValue) return;

    // Si l'utilisateur colle directement un <iframe>, on essaie d'en extraire l'URL.
    let url = safeValue;
    if (safeValue.toLowerCase().includes("<iframe")) {
      const match = safeValue.match(/src=["']([^"']+)["']/i);
      if (match?.[1]) {
        url = match[1];
      }
    }

    insertBlockAtSlash(
      `<figure class="embed-block"><p class="embed-url">${url}</p></figure>`
    );
  };

  const handleSetLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href ?? "";
    const url = window.prompt("URL du lien", previousUrl ?? "") ?? "";
    const safeUrl = url.trim();
    if (!safeUrl) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: safeUrl }).run();
  };

  const handleToggleChapo = () => {
    if (!editor) return;
    const attrs = editor.getAttributes("paragraph") || {};
    const currentClass: string = attrs.class || "";
    const classes = currentClass
      .split(" ")
      .map((c: string) => c.trim())
      .filter(Boolean);
    const hasChapo = classes.includes("chapo");
    const nextClasses = hasChapo
      ? classes.filter((c: string) => c !== "chapo")
      : [...classes, "chapo"];

    ingestDebug({
      sessionId: "fb943b",
      runId: "pre-fix",
      hypothesisId: "H_CHAPO_TOGGLE",
      location: "app/components/RichArticleEditor.tsx:handleToggleChapo",
      message: "Toggle chapo clicked",
      data: { beforeClasses: classes, afterClasses: nextClasses },
    });

    editor
      .chain()
      .focus()
      .updateAttributes("paragraph", {
        class: nextClasses.join(" ") || null,
      })
      .run();
  };

  return (
    <div
      className={
        chrome === "none"
          ? className
          : `rounded-xl border border-rer-border bg-white px-3 py-2 text-sm text-rer-text shadow-sm ${className}`
      }
    >
      {!readOnly && (
        <FloatingMenu
          editor={editor}
          shouldShow={({ state }) => {
            try {
              const { $from } = state.selection;
              // Afficher le menu d’insertion uniquement sur un paragraphe contenant
              // un « / » seul, pour un comportement type slash‑menu.
              const text = ($from.parent.textContent ?? "").trim();
              return (
                state.selection.empty &&
                $from.parent.type.name === "paragraph" &&
                text === "/"
              );
            } catch {
              return false;
            }
          }}
          className="flex items-center gap-1 rounded-full border border-rer-border bg-white px-2 py-1 text-[11px] text-rer-muted shadow-sm"
        >
          <button
            type="button"
            onClick={handleInsertImage}
            className="inline-flex items-center rounded-full border border-dashed border-rer-border px-2 py-1 hover:bg-rer-app"
          >
            + Image
          </button>
          <button
            type="button"
            onClick={handleInsertEmbed}
            className="inline-flex items-center rounded-full border border-dashed border-rer-border px-2 py-1 hover:bg-rer-app"
          >
            + Embed
          </button>
          <span className="mx-1 h-4 w-px bg-rer-border/60" />
          <button
            type="button"
            onClick={() => applyHeadingFromSlash(2)}
            className="inline-flex items-center rounded-full border border-rer-border px-2 py-1 text-[10px] font-semibold text-rer-text hover:bg-rer-app"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => applyHeadingFromSlash(3)}
            className="inline-flex items-center rounded-full border border-rer-border px-2 py-1 text-[10px] font-semibold text-rer-text hover:bg-rer-app"
          >
            H3
          </button>
          <button
            type="button"
            onClick={applyBlockquoteFromSlash}
            className="inline-flex items-center rounded-full border border-rer-border px-2 py-1 text-[10px] text-rer-text hover:bg-rer-app"
          >
            Citation
          </button>
        </FloatingMenu>
      )}

      {!readOnly && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-1 rounded-full border border-rer-border bg-white px-3 py-2 text-[12px] text-rer-text shadow-lg"
        >
          <button
            type="button"
            title="Gras (Ctrl+B)"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`${baseButtonClasses} ${
              editor.isActive("bold") ? `${activeButtonClasses} font-bold` : idleButtonClasses
            }`}
          >
            <span className="font-bold">Gras</span>
          </button>
          <button
            type="button"
            title="Italique (Ctrl+I)"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`${baseButtonClasses} ${
              editor.isActive("italic") ? `${activeButtonClasses} italic` : idleButtonClasses
            }`}
          >
            <span className="italic">Italique</span>
          </button>
          <span className="mx-1 h-4 w-px bg-rer-border/70" />
          <button
            type="button"
            title="Ajouter ou modifier un lien"
            onClick={handleSetLink}
            className={`${baseButtonClasses} ${
              editor.isActive("link") ? activeButtonClasses : idleButtonClasses
            }`}
          >
            🔗 Lien
          </button>
          <span className="mx-1 h-4 w-px bg-rer-border/70" />
          <button
            type="button"
            title="Titre niveau 2"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={`${baseButtonClasses} ${
              editor.isActive("heading", { level: 2 }) ? activeButtonClasses : idleButtonClasses
            }`}
          >
            H2
          </button>
          <button
            type="button"
            title="Titre niveau 3"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            className={`${baseButtonClasses} ${
              editor.isActive("heading", { level: 3 }) ? activeButtonClasses : idleButtonClasses
            }`}
          >
            H3
          </button>
          <span className="mx-1 h-4 w-px bg-rer-border/70" />
          <button
            type="button"
            title="Liste à puces"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`${baseButtonClasses} ${
              editor.isActive("bulletList") ? activeButtonClasses : idleButtonClasses
            }`}
          >
            Liste
          </button>
          <button
            type="button"
            title="Citation"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`${baseButtonClasses} ${
              editor.isActive("blockquote")
                ? `${activeButtonClasses} italic`
                : idleButtonClasses
            }`}
          >
            Citation
          </button>
          {hasChapo && (
            <>
              <span className="mx-1 h-4 w-px bg-rer-border/70" />
              <button
                type="button"
                title="Basculer le style chapô"
                onClick={handleToggleChapo}
                className={`${baseButtonClasses} ${
                  editor.isActive("paragraph", { class: "chapo" })
                    ? `${activeButtonClasses} font-semibold`
                    : idleButtonClasses
                }`}
              >
                Chapô
              </button>
            </>
          )}
        </BubbleMenu>
      )}

      <div className="prose prose-sm max-w-none text-rer-text prose-h2:text-xl prose-h2:font-semibold prose-h3:text-lg prose-h3:font-semibold prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-blockquote:border-l-2 prose-blockquote:border-rer-blue prose-blockquote:pl-3 prose-blockquote:text-rer-text focus:outline-none">
        <EditorContent editor={editor} />
      </div>

      {!readOnly && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden
        />
      )}
    </div>
  );
}

export default RichArticleEditor;

