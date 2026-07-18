export type NoteArticle = {
  title: string;
  description: string;
  url: string;
};

const NOTE_RSS_URL = "https://note.com/teiteiteite1/rss/";

function decodeEntities(value: string) {
  const entities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
    nbsp: " ",
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }

    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }

    return entities[entity.toLowerCase()] ?? match;
  });
}

function getTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, "").trim() ?? "";
}

function toPlainText(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

export async function getLatestNoteArticles(): Promise<NoteArticle[]> {
  try {
    const response = await fetch(NOTE_RSS_URL, {
      next: { revalidate: 600 },
      headers: { Accept: "application/rss+xml, application/xml;q=0.9" },
    });

    if (!response.ok) return [];

    const xml = await response.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

    return items.slice(0, 3).flatMap((item) => {
      const title = decodeEntities(getTag(item, "title"));
      const url = decodeEntities(getTag(item, "link"));
      const description = toPlainText(getTag(item, "description"))
        .replace(/続きをみる\s*$/u, "")
        .trim();

      if (!title || !url) return [];
      return [{ title, description, url }];
    });
  } catch {
    return [];
  }
}
