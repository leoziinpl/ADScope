export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido"
    });
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

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY não configurada."
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
Explique os principais problemas encontrados e o que provavelmente está impedindo o anúncio de performar melhor.

2. TÍTULO
Avalie o título atual e crie 5 títulos melhores, pensados para:
- busca da Shopee
- palavras-chave
- intenção de compra
- clareza
- conversão

Dê uma nota de 0 a 10 para cada título e indique qual você usaria.

3. INDEXAÇÃO
Liste palavras-chave relevantes que podem ajudar o produto a aparecer em mais pesquisas dentro da Shopee.

Separe em:
- palavras principais
- palavras secundárias
- características
- intenção de compra

4. DESCRIÇÃO 10/10
Crie uma descrição completa, persuasiva e fácil de ler.
Use emojis com moderação.
Inclua:
- apresentação do produto
- benefícios
- características
- diferenciais
- indicação de uso
- chamada para compra

5. CONVERSÃO
Analise visualizações, curtidas e compras.
Explique onde parece estar o gargalo.

6. PREÇO
Analise a relação entre preço normal e promocional quando houver dados.
Não diga que o preço está caro ou barato em relação ao mercado sem dados de concorrentes.

7. MELHORIAS PRIORITÁRIAS
Liste as melhorias em ordem de prioridade.

Use:
🔴 prioridade alta
🟡 prioridade média
🟢 prioridade baixa

8. PLANO DE AÇÃO
Diga exatamente o que o vendedor deveria alterar:
1º primeiro
2º segundo
3º terceiro

9. VEREDITO
Dê uma nota geral de 0 a 10 para o anúncio e explique brevemente.

Não invente dados que não foram fornecidos.
Não prometa posicionamento, indexação ou vendas garantidas.
Se não houver informação suficiente para determinada conclusão, diga isso claramente.
`;

    const model = "gemini-2.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY.trim())}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7
          }
        })
      }
    );

    const dataIA = await response.json();

    if (!response.ok) {
      console.error("Erro Gemini:", dataIA);

      return res.status(response.status).json({
        error:
          dataIA?.error?.message ||
          "Não foi possível realizar a análise."
      });
    }

    const analise =
      dataIA?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        ?.join("\n")
        ?.trim();

    if (!analise) {
      return res.status(500).json({
        error: "A IA não retornou uma análise."
      });
    }

    return res.status(200).json({
      analise
    });

  } catch (error) {
    console.error("Erro interno:", error);

    return res.status(500).json({
      error: "Erro interno ao analisar o anúncio."
    });
  }
}
