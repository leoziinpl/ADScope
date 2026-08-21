export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const {
      titulo = "",
      preco = "",
      precoPromocional = "",
      visualizacoes = "",
      curtidas = "",
      compras = "",
      data = "",
      link = ""
    } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY não configurada."
      });
    }

    const prompt = `
Você é um especialista em Shopee Brasil, marketplace, copywriting,
SEO para marketplace, conversão de anúncios e e-commerce.

Analise este anúncio:

TÍTULO:
${titulo}

PREÇO:
R$ ${preco}

PREÇO PROMOCIONAL:
R$ ${precoPromocional}

VISUALIZAÇÕES:
${visualizacoes}

CURTIDAS:
${curtidas}

COMPRAS:
${compras}

DATA DO ANÚNCIO:
${data}

LINK:
${link}

Sua função é agir como um consultor especialista em vendas na Shopee.

Faça uma análise prática e específica do anúncio.

Responda em português do Brasil com:

1. DIAGNÓSTICO
Explique os principais problemas encontrados.

2. TÍTULO
Avalie o título atual e crie 5 títulos melhores, pensados para:
- busca da Shopee
- palavras-chave
- intenção de compra
- clareza
- conversão

Dê uma nota de 0 a 10 para cada título.

3. INDEXAÇÃO
Liste palavras-chave relevantes que podem ajudar o produto a aparecer
em mais pesquisas dentro da Shopee.

4. DESCRIÇÃO 10/10
Crie uma descrição completa, persuasiva e fácil de ler.
Use emojis com moderação, benefícios, características e chamada para compra.

5. CONVERSÃO
Analise visualizações, curtidas e compras.
Explique onde parece estar o gargalo.

6. PREÇO
Analise a relação entre preço normal e promocional, quando houver dados.

7. MELHORIAS PRIORITÁRIAS
Liste as melhorias em ordem de prioridade.

8. PLANO DE AÇÃO
Diga exatamente o que o vendedor deveria alterar primeiro, segundo e terceiro.

Não invente dados que não foram fornecidos.
Não prometa posicionamento ou vendas garantidas.
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "model: "gpt-5.6",",
        input: prompt
      })
    });

    const dataIA = await response.json();

    if (!response.ok) {
      console.error("Erro OpenAI:", dataIA);

      return res.status(response.status).json({
        error:
          dataIA?.error?.message ||
          "Não foi possível realizar a análise."
      });
    }

    const analise =
      dataIA.output
        ?.flatMap(item => item.content || [])
        ?.filter(item => item.type === "output_text")
        ?.map(item => item.text)
        ?.join("\n") || "A IA não retornou uma análise.";

    return res.status(200).json({ analise });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro interno ao analisar o anúncio."
    });
  }
}
