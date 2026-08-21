import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const root = document.querySelector("#app");
const cfg = window.ADSCOPE_CONFIG || {};

if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
  document.body.innerHTML = `
    <div style="font-family:Arial;padding:40px;max-width:720px;margin:auto">
      <h2>AdScope não configurado</h2>
      <p>Preencha SUPABASE_URL e SUPABASE_ANON_KEY no config.js.</p>
    </div>`;
  throw new Error("Supabase config ausente");
}

const supabase = createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_ANON_KEY
);

const state = {
  user: null,
  ads: [],
  mode: "login"
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));

const money = (n) =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const pct = (n) =>
  `${Number(n || 0).toFixed(2)}%`;


// ==========================================
// DIAGNÓSTICO
// ==========================================

function calc(a) {

  const views = +a.views || 0;
  const likes = +a.likes || 0;
  const buys = +(a.purchases ?? a.buys) || 0;

  const conv =
    views ? (buys / views) * 100 : 0;

  const likeRate =
    views ? (likes / views) * 100 : 0;

  let score = 100;

  const problems = [];
  const actions = [];


  // Conversão

  if (conv < 0.5) {

    score -= 30;

    problems.push([
      "Conversão muito baixa",
      "O anúncio recebe visualizações, mas poucas pessoas compram."
    ]);

    actions.push(
      "Revisar oferta, preço promocional, foto principal e prova social."
    );

  } else if (conv < 1) {

    score -= 15;

    problems.push([
      "Conversão abaixo do ideal",
      "Existe tráfego, mas uma parcela pequena termina em compra."
    ]);

    actions.push(
      "Testar uma oferta mais forte e melhorar a apresentação do produto."
    );
  }


  // Curtidas

  if (likeRate < 1) {

    score -= 15;

    problems.push([
      "Poucas curtidas",
      "O anúncio está gerando pouco envolvimento proporcional às visualizações."
    ]);

    actions.push(
      "Testar nova imagem principal e destacar benefício e preço promocional."
    );
  }


  // Preços

  const sale =
    +(a.sale_price ?? a.sale) || 0;

  const promo =
    +(a.promo_price ?? a.promo) || 0;


  if (sale && promo && promo >= sale) {

    score -= 10;

    problems.push([
      "Promoção sem vantagem aparente",
      "O preço promocional não está abaixo do preço de venda."
    ]);

    actions.push(
      "Conferir a configuração da promoção."
    );
  }


  if (
    sale &&
    promo &&
    promo < sale &&
    (sale - promo) / sale < 0.05
  ) {

    score -= 6;

    problems.push([
      "Desconto pouco perceptível",
      "A diferença entre preço normal e promocional é pequena."
    ]);

    actions.push(
      "Testar uma promoção mais competitiva sem comprometer sua margem."
    );
  }


  // Idade do anúncio

  const created =
    a.ad_created_at ?? a.created;

  const days = created
    ? Math.max(
        0,
        Math.floor(
          (Date.now() -
            new Date(created + "T00:00:00")) /
            86400000
        )
      )
    : null;


  if (days !== null && days < 7) {

    score -= 5;

    problems.push([
      "Anúncio recente",
      "Ainda existe pouco histórico para uma conclusão forte."
    ]);

    actions.push(
      "Acompanhar o anúncio por mais alguns dias antes de grandes mudanças."
    );
  }


  if (!problems.length) {

    problems.push([
      "Sem gargalo crítico",
      "Os indicadores básicos não apontam um problema grave."
    ]);
  }


  if (!actions.length) {

    actions.push(
      "Faça testes controlados de capa, preço e oferta, alterando uma variável por vez."
    );
  }


  return {

    score: Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    ),

    conv,
    likeRate,
    days,
    problems,
    actions
  };
}


// ==========================================
// LOGIN / CADASTRO
// ==========================================

function authScreen(
  mode = "login",
  message = ""
) {

  state.mode = mode;

  root.innerHTML = `

    <div class="login">

      <div class="login-card">

        <div class="brand big">
          Ad<span>Scope</span>
        </div>

        <h1>
          ${
            mode === "login"
              ? "Entrar na sua conta"
              : "Criar sua conta"
          }
        </h1>

        <p>
          ${
            mode === "login"
              ? "Acesse seus anúncios e acompanhe o histórico de performance."
              : "Crie sua conta para salvar anúncios e diagnósticos na nuvem."
          }
        </p>

        ${
          message
            ? `
              <div
                class="demo"
                style="color:#344054"
              >
                ${esc(message)}
              </div>
            `
            : ""
        }

        <label>E-mail</label>

        <input
          id="email"
          type="email"
          placeholder="voce@email.com"
        >


        <label>Senha</label>

        <input
          id="pass"
          type="password"
          placeholder="Mínimo 6 caracteres"
        >


        <button id="authBtn">

          ${
            mode === "login"
              ? "Entrar"
              : "Criar conta"
          }

        </button>


        <button
          id="toggleAuth"
          class="ghost dark"
          style="width:100%;margin-top:10px"
        >

          ${
            mode === "login"
              ? "Ainda não tenho conta"
              : "Já tenho uma conta"
          }

        </button>


        <div class="demo">

          Se a confirmação por e-mail
          estiver ativa no Supabase,
          você precisará confirmar o
          cadastro antes de entrar.

        </div>

      </div>

    </div>
  `;


  document
    .querySelector("#toggleAuth")
    .onclick = () => {

      authScreen(
        mode === "login"
          ? "signup"
          : "login"
      );

    };


  document
    .querySelector("#authBtn")
    .onclick = handleAuth;
}


async function handleAuth() {

  const email =
    document
      .querySelector("#email")
      .value
      .trim();

  const password =
    document
      .querySelector("#pass")
      .value;


  if (!email || !password) {

    alert(
      "Informe e-mail e senha."
    );

    return;
  }


  if (password.length < 6) {

    alert(
      "A senha precisa ter pelo menos 6 caracteres."
    );

    return;
  }


  const btn =
    document.querySelector(
      "#authBtn"
    );

  btn.disabled = true;

  btn.textContent =
    "Aguarde...";


  try {

    // CADASTRO

    if (
      state.mode ===
      "signup"
    ) {

      const {
        data,
        error
      } =
        await supabase.auth.signUp({
          email,
          password
        });


      if (error)
        throw error;


      if (!data.session) {

        authScreen(
          "login",
          "Conta criada. Verifique seu e-mail para confirmar o cadastro e depois faça login."
        );

        return;
      }


      state.user =
        data.user;

    }

    // LOGIN

    else {

      const {
        data,
        error
      } =
        await supabase.auth
          .signInWithPassword({
            email,
            password
          });


      if (error)
        throw error;


      state.user =
        data.user;
    }


    await loadAds();

    renderDashboard();


  } catch (err) {

    alert(
      err.message ||
      "Não foi possível autenticar."
    );

  } finally {

    const b =
      document.querySelector(
        "#authBtn"
      );


    if (b) {

      b.disabled = false;

      b.textContent =
        state.mode === "login"
          ? "Entrar"
          : "Criar conta";
    }
  }
}


// ==========================================
// LOGOUT
// ==========================================

async function logout() {

  await supabase.auth.signOut();

  state.user = null;

  state.ads = [];

  authScreen("login");
}


// ==========================================
// ESTRUTURA DO PAINEL
// ==========================================

function shell() {

  root.innerHTML = `

    <header>

      <div class="brand">

        Ad<span>Scope</span>

      </div>

      <div class="user">

        ${esc(
          state.user?.email ||
          ""
        )}

        <button
          id="logout"
          class="ghost"
        >
          Sair
        </button>

      </div>

    </header>


    <main>

      <div id="page"></div>

    </main>
  `;


  document
    .querySelector("#logout")
    .onclick = logout;
}


// ==========================================
// CARREGAR ANÚNCIOS
// ==========================================

async function loadAds() {

  const {
    data,
    error
  } =
    await supabase

      .from("ads")

      .select("*")

      .order(
        "updated_at",
        {
          ascending: false
        }
      );


  if (error)
    throw error;


  state.ads =
    data || [];
}


// ==========================================
// DASHBOARD
// ==========================================

async function renderDashboard() {

  shell();


  const page =
    document.querySelector(
      "#page"
    );


  const total =
    state.ads.length;


  const critical =
    state.ads.filter(
      (a) =>
        calc(a).score < 60
    ).length;


  const attention =
    state.ads.filter(
      (a) => {

        const s =
          calc(a).score;

        return (
          s >= 60 &&
          s < 80
        );
      }
    ).length;


  page.innerHTML = `

    <div class="top">

      <div>

        <h1>Dashboard</h1>

        <p>
          Monitore seus anúncios
          e descubra rapidamente
          onde está o gargalo.
        </p>

      </div>


      <button id="new">
        + Novo anúncio
      </button>

    </div>


    <div class="cards">

      <div>
        <small>Anúncios</small>
        <b>${total}</b>
      </div>

      <div>
        <small>Críticos</small>
        <b class="red">
          ${critical}
        </b>
      </div>

      <div>
        <small>Atenção</small>
        <b class="yellow">
          ${attention}
        </b>
      </div>

      <div>
        <small>Saudáveis</small>
        <b class="green">
          ${
            total -
            critical -
            attention
          }
        </b>
      </div>

    </div>


    <section class="panel">

      <div class="panel-head">

        <h2>
          Meus anúncios
        </h2>

        <span>
          ${total}
          cadastrado(s)
        </span>

      </div>


      ${
        total
          ? `

          <div class="table">

            <div class="tr th">

              <span>Anúncio</span>
              <span>Preço</span>
              <span>Compras</span>
              <span>Conversão</span>
              <span>Score</span>
              <span></span>

            </div>


            ${
              state.ads
                .map(
                  (a, i) => {

                    const c =
                      calc(a);


                    return `

                      <div class="tr">

                        <span>

                          <b>
                            ${
                              esc(
                                a.name ||
                                "Anúncio"
                              )
                            }
                          </b>

                          <small>
                            ${
                              esc(
                                a.url
                              )
                            }
                          </small>

                        </span>


                        <span>

                          ${
                            money(
                              a.promo_price ||
                              a.sale_price
                            )
                          }

                        </span>


                        <span>

                          ${
                            a.purchases ||
                            0
                          }

                        </span>


                        <span>

                          ${
                            pct(
                              c.conv
                            )
                          }

                        </span>


                        <span>

                          <em
                            class="${
                              c.score < 60
                                ? "critical"
                                : c.score < 80
                                ? "attention"
                                : "good"
                            }"
                          >

                            ${
                              c.score
                            }

                          </em>

                        </span>


                        <span>

                          <button
                            class="mini"
                            data-i="${i}"
                          >
                            Ver
                          </button>

                        </span>

                      </div>
                    `;
                  }
                )
                .join("")
            }

          </div>
        `
          : `

          <div class="empty">

            Nenhum anúncio cadastrado.

            <br>

            <button id="first">

              Cadastrar primeiro anúncio

            </button>

          </div>
        `
      }

    </section>
  `;


  document
    .querySelector("#new")
    .onclick =
      () => renderForm();


  const first =
    document.querySelector(
      "#first"
    );


  if (first) {

    first.onclick =
      () => renderForm();
  }


  document
    .querySelectorAll(
      ".mini"
    )
    .forEach(
      (b) => {

        b.onclick =
          () =>
            renderDetail(
              +b.dataset.i
            );
      }
    );
}


// ==========================================
// FORMULÁRIO
// ==========================================

function renderForm(
  index = null
) {

  shell();


  const page =
    document.querySelector(
      "#page"
    );


  const a =
    index === null
      ? {}
      : state.ads[index];


  page.innerHTML = `

    <div class="top">

      <div>

        <h1>
          ${
            index === null
              ? "Novo anúncio"
              : "Editar anúncio"
          }
        </h1>

        <p>
          Cadastre somente
          os dados essenciais.
        </p>

      </div>


      <button
        id="back"
        class="ghost dark"
      >
        Voltar
      </button>

    </div>


    <section
      class="panel form"
    >

      <label>
        Nome interno do anúncio
      </label>

      <input
        id="name"
        value="${esc(a.name || "")}"
        placeholder="Ex.: Kit 5 calcinhas algodão"
      >


      <label>
        Link do anúncio
      </label>

      <input
        id="url"
        value="${esc(a.url || "")}"
        placeholder="https://shopee.com.br/..."
      >


      <div class="two">

        <div>

          <label>
            Preço de venda (R$)
          </label>

          <input
            id="sale"
            type="number"
            step=".01"
            value="${a.sale_price || ""}"
          >

        </div>


        <div>

          <label>
            Preço promocional (R$)
          </label>

          <input
            id="promo"
            type="number"
            step=".01"
            value="${a.promo_price || ""}"
          >

        </div>

      </div>


      <div class="two">

        <div>

          <label>
            Visualizações
          </label>

          <input
            id="views"
            type="number"
            value="${a.views || ""}"
          >

        </div>


        <div>

          <label>
            Curtidas
          </label>

          <input
            id="likes"
            type="number"
            value="${a.likes || ""}"
          >

        </div>

      </div>


      <div class="two">

        <div>

          <label>
            Compras
          </label>

          <input
            id="buys"
            type="number"
            value="${a.purchases || ""}"
          >

        </div>


        <div>

          <label>
            Data do anúncio
          </label>

          <input
            id="created"
            type="date"
            value="${a.ad_created_at || ""}"
          >

        </div>

      </div>


      <button id="save">

        Salvar anúncio

      </button>

    </section>
  `;


  document
    .querySelector("#back")
    .onclick =
      renderDashboard;


  document
    .querySelector("#save")
    .onclick =
      () =>
        saveAd(index);
}


// ==========================================
// SALVAR / ATUALIZAR ANÚNCIO
// ==========================================

async function saveAd(index) {

  const payload = {

    user_id:
      state.user.id,

    name:
      document
        .querySelector("#name")
        .value
        .trim(),

    url:
      document
        .querySelector("#url")
        .value
        .trim(),

    sale_price:
      +document
        .querySelector("#sale")
        .value || 0,

    promo_price:
      +document
        .querySelector("#promo")
        .value || 0,

    views:
      +document
        .querySelector("#views")
        .value || 0,

    likes:
      +document
        .querySelector("#likes")
        .value || 0,

    purchases:
      +document
        .querySelector("#buys")
        .value || 0,

    ad_created_at:
      document
        .querySelector("#created")
        .value || null,

    updated_at:
      new Date()
        .toISOString()
  };


  if (
    !payload.url ||
    !payload.views
  ) {

    alert(
      "Preencha pelo menos o link e as visualizações."
    );

    return;
  }


  try {

    let ad;


    if (index === null) {

      const {
        data,
        error
      } =
        await supabase

          .from("ads")

          .insert(payload)

          .select()

          .single();


      if (error)
        throw error;


      ad = data;

    } else {

      const current =
        state.ads[index];


      const {
        data,
        error
      } =
        await supabase

          .from("ads")

          .update(payload)

          .eq(
            "id",
            current.id
          )

          .select()

          .single();


      if (error)
        throw error;


      ad = data;
    }


    // SALVAR HISTÓRICO

    const {
      error: snapError
    } =
      await supabase

        .from(
          "ad_snapshots"
        )

        .insert({

          ad_id:
            ad.id,

          user_id:
            state.user.id,

          sale_price:
            ad.sale_price,

          promo_price:
            ad.promo_price,

          views:
            ad.views,

          likes:
            ad.likes,

          purchases:
            ad.purchases

        });


    if (snapError)
      throw snapError;


    await loadAds();

    renderDashboard();


  } catch (err) {

    alert(
      err.message ||
      "Não foi possível salvar o anúncio."
    );
  }
}


// ==========================================
// DETALHES + HISTÓRICO
// ==========================================

async function renderDetail(i) {

  const a =
    state.ads[i];


  const c =
    calc(a);


  const {
    data: history,
    error
  } =
    await supabase

      .from(
        "ad_snapshots"
      )

      .select("*")

      .eq(
        "ad_id",
        a.id
      )

      .order(
        "captured_at",
        {
          ascending: false
        }
      );


  if (error) {

    alert(
      error.message
    );

    return;
  }


  shell();


  const page =
    document.querySelector(
      "#page"
    );


  page.innerHTML = `

    <div class="top">

      <div>

        <h1>
          ${
            esc(
              a.name ||
              "Anúncio"
            )
          }
        </h1>

        <p>
          ${esc(a.url)}
        </p>

      </div>


      <div>

        <button id="edit">
          Editar
        </button>

        <button
          id="delete"
          class="ghost dark"
        >
          Excluir
        </button>

        <button
          id="back"
          class="ghost dark"
        >
          Voltar
        </button>

      </div>

    </div>


    <div class="cards">

      <div>

        <small>Score</small>

        <b>
          ${c.score}/100
        </b>

      </div>


      <div>

        <small>
          Conversão
        </small>

        <b>
          ${pct(c.conv)}
        </b>

      </div>


      <div>

        <small>
          Curtidas
        </small>

        <b>
          ${pct(c.likeRate)}
        </b>

      </div>


      <div>

        <small>
          Histórico
        </small>

        <b>
          ${
            history?.length ||
            0
          }
        </b>

      </div>

    </div>


    <section class="panel">

      <h2>
        Diagnóstico atual
      </h2>


      ${
        c.problems
          .map(
            (p, n) => `

              <div class="problem">

                <b>
                  ${n + 1}.
                  ${p[0]}
                </b>

                <p>
                  ${p[1]}
                </p>

              </div>
            `
          )
          .join("")
      }


      <h2>
        Plano de ação
      </h2>


      ${
        c.actions
          .map(
            (x, n) => `

              <div class="action">

                <i>
                  ${n + 1}
                </i>

                <span>
                  ${x}
                </span>

              </div>
            `
          )
          .join("")
      }

    </section>


    <section class="panel">

      <h2>
        Histórico do anúncio
      </h2>


      ${
        history?.length

          ? `

          <div class="history">

            ${
              history
                .map(
                  (h) => {

                    const hc =
                      calc({

                        views:
                          h.views,

                        likes:
                          h.likes,

                        purchases:
                          h.purchases,

                        sale_price:
                          h.sale_price,

                        promo_price:
                          h.promo_price

                      });


                    return `

                      <div class="hist">

                        <b>
                          ${
                            new Date(
                              h.captured_at
                            )
                            .toLocaleString(
                              "pt-BR"
                            )
                          }
                        </b>


                        <span>

                          ${
                            (
                              h.views ||
                              0
                            )
                            .toLocaleString(
                              "pt-BR"
                            )
                          }

                          visualizações

                        </span>


                        <span>

                          ${
                            (
                              h.likes ||
                              0
                            )
                            .toLocaleString(
                              "pt-BR"
                            )
                          }

                          curtidas

                        </span>


                        <span>

                          ${
                            (
                              h.purchases ||
                              0
                            )
                            .toLocaleString(
                              "pt-BR"
                            )
                          }

                          compras

                        </span>


                        <span>

                          Conversão
                          ${
                            pct(
                              hc.conv
                            )
                          }

                        </span>


                        <span>

                          Preço
                          ${
                            money(
                              h.promo_price ||
                              h.sale_price
                            )
                          }

                        </span>

                      </div>
                    `;
                  }
                )
                .join("")
            }

          </div>
        `

          : "Nenhum histórico ainda."
      }

    </section>
  `;


  document
    .querySelector("#back")
    .onclick =
      renderDashboard;


  document
    .querySelector("#edit")
    .onclick =
      () =>
        renderForm(i);


  document
    .querySelector("#delete")
    .onclick =
      async () => {

        if (
          !confirm(
            "Tem certeza que deseja excluir este anúncio?"
          )
        )
          return;


        const {
          error
        } =
          await supabase

            .from("ads")

            .delete()

            .eq(
              "id",
              a.id
            );


        if (error) {

          alert(
            error.message
          );

          return;
        }


        await loadAds();

        renderDashboard();
      };
}


// ==========================================
// INICIAR ADSCOPE
// ==========================================

async function boot() {

  const {
    data: {
      session
    }
  } =
    await supabase.auth
      .getSession();


  if (
    session?.user
  ) {

    state.user =
      session.user;


    try {

      await loadAds();

      renderDashboard();

    } catch (err) {

      alert(
        err.message ||
        "Erro ao carregar anúncios."
      );

      authScreen(
        "login"
      );
    }

  } else {

    authScreen(
      "login"
    );
  }
}


boot();
