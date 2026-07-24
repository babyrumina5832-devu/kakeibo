// Netlify Function: レシート画像をAnthropic APIで解析する安全な仲介役
// APIキーはNetlifyの環境変数（画面上の設定）にのみ保存され、このファイルには書きません。

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "サーバーにAPIキーが設定されていません" }) };
  }

  try {
    const { imageBase64, mediaType, categories } = JSON.parse(event.body || "{}");
    if (!imageBase64 || !categories) {
      return { statusCode: 400, body: JSON.stringify({ error: "リクエストが不正です" }) };
    }

    const catNames = categories.join("、");
    const prompt = `このレシート画像から、店名(store)・合計金額の数値のみ(amount)・最も当てはまるカテゴリ(category)・購入した商品名の一覧(items)を読み取ってください。カテゴリは次の中から必ず一つ選んでください: ${catNames}。itemsはレシートに記載された商品名を短い順番リストにしてください（金額は含めず商品名のみ、読み取れない場合は空配列）。判読できない場合は amount は 0、store は空文字にしてください。JSON以外の文字列を一切含めず、次の形式のJSONだけを返してください: {"store": "string", "amount": number, "category": "string", "items": ["string"]}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
