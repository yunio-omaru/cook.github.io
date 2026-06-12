let allRecipes = []; 
let currentGenre = null;
let currentTag = null;
let currentPreviewData = null;

document.addEventListener("DOMContentLoaded", () => {
  setupHeader();
  setupCategories();
  setupAddModal();
  setupPreviewActions();
  loadRecipeList();
  checkEditMode();
  setupGitHubSettings();
});

function returnToMainMenu() {
  currentGenre = null;
  currentTag = null;
  clearActiveCategories();
  document.getElementById("tagBar").style.display = "none";
  renderRecipeList();
  hideDetail();
}

function setupHeader() {
  document.getElementById("headerHome").addEventListener("click", returnToMainMenu);
  document.getElementById("addBtn").addEventListener("click", () => {
    document.getElementById("modalTitle").textContent = "レシピ追加";
    openAddModal();
  });
  document.getElementById("menuBtn").addEventListener("click", toggleTagBar);
}

function setupCategories() {
  const row = document.getElementById("categoryRow");
  row.addEventListener("click", (e) => {
    const btn = e.target.closest(".category-btn");
    if (!btn) return;
    const genre = btn.dataset.genre;
    if (!genre) return;
    
    if (btn.classList.contains("active")) {
      returnToMainMenu();
      return;
    }

    currentGenre = genre;
    currentTag = null;
    clearActiveCategories();
    btn.classList.add("active");
    renderRecipeList();
    hideDetail();
  });
}

function clearActiveCategories() {
  document.querySelectorAll(".category-btn").forEach((b) => b.classList.remove("active"));
}

function toggleTagBar() {
  const bar = document.getElementById("tagBar");
  if (bar.style.display === "flex") {
    bar.style.display = "none";
    currentTag = null;
    renderRecipeList();
    hideDetail();
    return;
  }
  const tags = new Set();
  allRecipes.forEach((r) => {
    (r.tags || []).forEach((t) => tags.add(t));
  });
  bar.innerHTML = "";
  Array.from(tags).sort().forEach((tag) => {
    const pill = document.createElement("button");
    pill.className = "tag-pill";
    pill.textContent = tag;
    pill.addEventListener("click", () => {
      currentTag = tag;
      currentGenre = null;
      clearActiveCategories();
      renderRecipeList();
      hideDetail();
    });
    bar.appendChild(pill);
  });
  bar.style.display = tags.size ? "flex" : "none";
}

async function loadRecipeList() {
  try {
    const res = await fetch("recipe-list.json", { cache: "no-store" });
    if (!res.ok) throw new Error("failed");
    const data = await res.json();
    allRecipes = Array.isArray(data) ? data : [];
    console.log("✓ レシピロード成功。レシピ数:", allRecipes.length);
  } catch (e) {
    console.error("レシピリスト読込失敗:", e);
    allRecipes = [];
  }
  renderRecipeList();
}

function renderRecipeList() {
  const listEl = document.getElementById("recipeList");
  listEl.innerHTML = "";

  let filtered = allRecipes.slice();
  if (currentGenre) {
    filtered = filtered.filter((r) => r.genre === currentGenre);
  }
  if (currentTag) {
    filtered = filtered.filter((r) => (r.tags || []).includes(currentTag));
  }

  if (filtered.length === 0) {
    listEl.innerHTML = '<div style="color:var(--muted); font-size:0.8rem; padding:1rem;">レシピがまだありません。</div>';
    return;
  }

  filtered.forEach((recipe) => {
    const card = document.createElement("article");
    card.className = "recipe-card-mini";
    card.addEventListener("click", () => {
      window.location.href = "recipes/" + recipe.file;
    });

    const thumbWrapper = document.createElement("div");
    thumbWrapper.className = "recipe-thumb-wrapper";

    const imageSrc = recipe.thumb || recipe.image || "";

    if (imageSrc && imageSrc !== "") {
      const img = document.createElement("img");
      img.className = "recipe-thumb";
      img.src = imageSrc;
      img.alt = recipe.title || "レシピ画像";
      thumbWrapper.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "recipe-thumb-placeholder";
      placeholder.textContent = (recipe.genre || "食").substring(0, 1);
      thumbWrapper.appendChild(placeholder);
    }

    const body = document.createElement("div");
    body.className = "recipe-card-mini-body";

    const title = document.createElement("div");
    title.className = "recipe-card-mini-title";
    title.textContent = recipe.title || "";

    const sub = document.createElement("div");
    sub.className = "recipe-card-mini-sub";
    sub.textContent = (recipe.tags || []).join(", ");

    body.appendChild(title);
    body.appendChild(sub);
    card.appendChild(thumbWrapper);
    card.appendChild(body);
    listEl.appendChild(card);
  });
}

async function openDetail(recipe, isPreview = false) {
  const wrapper = document.getElementById("detailWrapper");
  const titleEl = document.getElementById("detailTitle");
  const subEl = document.getElementById("detailSubtitle");
  const tagEl = document.getElementById("detailTag");
  const imgEl = document.getElementById("detailImage");
  const ingEl = document.getElementById("detailIngredients");
  const stepsEl = document.getElementById("detailSteps");
  const actionsEl = document.getElementById("previewActions");

  if (isPreview) {
    actionsEl.style.display = "flex";
    currentPreviewData = recipe;
  } else {
    actionsEl.style.display = "none";
    currentPreviewData = null;
  }

  titleEl.textContent = recipe.title || "";
  subEl.textContent = recipe.subtitle || "";
  tagEl.textContent = (recipe.tags || []).join(", ") || recipe.genre || "";

  imgEl.src = recipe.image || recipe.thumb || "";
  imgEl.style.display = imgEl.src ? "block" : "none";

  ingEl.innerHTML = "";
  (recipe.ingredients || []).forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    ingEl.appendChild(li);
  });

  stepsEl.innerHTML = "";
  (recipe.steps || []).forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    stepsEl.appendChild(li);
  });

  wrapper.style.display = "flex";
  wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideDetail() {
  document.getElementById("detailWrapper").style.display = "none";
  document.getElementById("previewActions").style.display = "none";
  currentPreviewData = null;
}

function setupPreviewActions() {
  document.getElementById("previewEditBtn").addEventListener("click", () => {
    hideDetail();
    document.getElementById("modalTitle").textContent = "レシピ編集";
    openAddModal();
  });

  document.getElementById("previewSubmitBtn").addEventListener("click", async () => {
    if (!currentPreviewData) return;
    const success = await uploadToGitHub(currentPreviewData);
    if (success) {
      closeAddModal(true); 
      returnToMainMenu();
    }
  });
}

function setupAddModal() {
  const backdrop = document.getElementById("addModalBackdrop");
  const closeBtn = document.getElementById("addModalClose");
  
  const handleClose = () => {
    if (isFormDirty()) {
      if (confirm("入力中の内容があります。保存せず終了してOK？")) {
        closeAddModal();
        returnToMainMenu();
      }
    } else {
      closeAddModal();
      returnToMainMenu();
    }
  };

  closeBtn.addEventListener("click", handleClose);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) handleClose(); });

  document.getElementById("previewBtn").addEventListener("click", async () => {
    const recipe = await collectRecipeFromForm();
    if (!recipe) return;
    openDetail(recipe, true);
    closeAddModal(false); 
  });

  document.getElementById("downloadBtn").addEventListener("click", async () => {
    const recipe = await collectRecipeFromForm();
    if (!recipe) return;
    const success = await uploadToGitHub(recipe);
    if (success) {
      closeAddModal(true); 
      returnToMainMenu();
    }
  });
}

function isFormDirty() {
  const title = document.getElementById("inputTitle").value.trim();
  const subtitle = document.getElementById("inputSubtitle").value.trim();
  const ingredients = document.getElementById("inputIngredients").value.trim();
  const steps = document.getElementById("inputSteps").value.trim();
  const fileInput = document.getElementById("inputImage");
  return !!(title || subtitle || ingredients || steps || (fileInput.files && fileInput.files.length > 0));
}

function openAddModal() {
  document.getElementById("addModalBackdrop").style.display = "flex";
}

function closeAddModal(clear = true) {
  document.getElementById("addModalBackdrop").style.display = "none";
  if (clear) {
    document.getElementById("inputTitle").value = "";
    document.getElementById("inputSubtitle").value = "";
    document.getElementById("inputIngredients").value = "";
    document.getElementById("inputSteps").value = "";
    document.getElementById("inputImage").value = "";
    currentPreviewData = null;
  }
}

async function collectRecipeFromForm() {
  const genre = document.getElementById("inputGenre").value.trim();
  const title = document.getElementById("inputTitle").value.trim();
  const subtitle = document.getElementById("inputSubtitle").value.trim();
  const ingredientsText = document.getElementById("inputIngredients").value;
  const stepsText = document.getElementById("inputSteps").value;
  const fileInput = document.getElementById("inputImage");

  if (!title) {
    alert("タイトルは必須です。");
    return null;
  }

  const ingredients = ingredientsText.split("\n").map((l) => l.trim()).filter((l) => l);
  const steps = stepsText.split("\n").map((l) => l.trim()).filter((l) => l);
  const tags = subtitle.split(",").map((t) => t.trim()).filter((t) => t);

  let imageData = "";
  if (fileInput.files && fileInput.files[0]) {
    imageData = await readFileAsDataURL(fileInput.files[0]);
  } else if (currentPreviewData && currentPreviewData.image) {
    imageData = currentPreviewData.image;
  }

  return {
    genre,
    title,
    subtitle,
    tags,
    ingredients,
    steps,
    image: imageData,
    thumb: imageData,
    file: safeFileName(title) + ".html",
  };
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); 
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

function safeFileName(title) {
  return title.replace(/[\\\/:*?"<>|]/g, "_").trim() || "recipe";
}

function setupGitHubSettings() {
  const toggle = document.getElementById("ghToggle");
  const content = document.getElementById("ghContent");
  const userEl = document.getElementById("ghUser");
  const tokenEl = document.getElementById("ghToken");

  userEl.value = localStorage.getItem("gh_user") || "";
  tokenEl.value = localStorage.getItem("gh_token") || "";

  toggle.addEventListener("click", () => {
    if (content.style.display === "block") {
      content.style.display = "none";
      toggle.textContent = "▶ GitHub自動保存の設定（初回のみ要入力）";
    } else {
      content.style.display = "block";
      toggle.textContent = "▼ GitHub自動保存の設定";
    }
  });

  userEl.addEventListener("input", () => localStorage.setItem("gh_user", userEl.value.trim()));
  tokenEl.addEventListener("input", () => localStorage.setItem("gh_token", tokenEl.value.trim()));
}

async function uploadToGitHub(recipe) {
  const user = localStorage.getItem("gh_user");
  const token = localStorage.getItem("gh_token");
  const repo = "cook.github.io"; 

  if (!user || !token) {
    alert("GitHubのユーザー名とトークンを設定してください。\n（「GitHub自動保存の設定」から入力できます）");
    document.getElementById("ghContent").style.display = "block";
    return false;
  }

  // --- 0. 画像の保存準備（画像が存在する場合のみ） ---
  if (recipe.rawBase64) {
    const imageUrl = `https://api.github.com/repos/${user}/${repo}/contents/${recipe.image}`;
    let imageSha = null;
    
    try {
      const res = await fetch(imageUrl, { headers: { "Authorization": `token ${token}` } });
      if (res.ok) { const data = await res.json(); imageSha = data.sha; }
    } catch (e) {}

    const bodyImage = {
      message: `recipe: Image ${imageSha ? 'Update' : 'Add'} for ${recipe.title}`,
      content: recipe.rawBase64
    };
    if (imageSha) bodyImage.sha = imageSha;

    try {
      const resImage = await fetch(imageUrl, {
        method: "PUT",
        headers: { "Authorization": `token ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(bodyImage)
      });
      if (!resImage.ok) {
        const err = await resImage.json();
        alert(`画像のアップロードに失敗しました: ${err.message}`);
        return false;
      }
    } catch (error) {
      alert("画像送信中に通信エラーが発生しました: " + error.message);
      return false;
    }
  }

  // --- 1. レシピHTMLの保存準備 ---
  const recipePath = "recipes/" + recipe.file;
  const recipeUrl = `https://api.github.com/repos/${user}/${repo}/contents/${recipePath}`;
  
  // 💡 【修正点1】オブジェクトを破壊せず、imageプロパティのパスだけを正しく「../」付きに修正します
  const adjustedRecipe = { ...recipe };
  if (recipe.image) {
    adjustedRecipe.image = "../" + recipe.image;
  }
  
  const htmlContent = buildRecipeCardHtml(adjustedRecipe);
  
  // 💡 【修正点2】日本語が絶対に文字化け・クラッシュしない安全なBase64エンコード処理に変更
  const base64Html = btoa(encodeURIComponent(htmlContent).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));

  let recipeSha = null;
  try {
    const res = await fetch(recipeUrl, { headers: { "Authorization": `token ${token}` } });
    if (res.ok) { const data = await res.json(); recipeSha = data.sha; }
  } catch (e) {}

  // --- 2. GitHubへレシピHTMLを送信 ---
  try {
    const bodyHtml = { message: `recipe: HTML ${recipeSha ? 'Update' : 'Add'} ${recipe.title}`, content: base64Html };
    if (recipeSha) bodyHtml.sha = recipeSha;
    
    const resHtml = await fetch(recipeUrl, {
      method: "PUT",
      headers: { "Authorization": `token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(bodyHtml)
    });

    if (resHtml.ok) {
      alert(`🎉 画像とレシピHTMLをGitHubへ保存しました！\n（一覧データはGitHub Actionsによって数秒後に自動更新されます）`);
      return true;
    } else {
      const err = await resHtml.json();
      alert(`HTMLの保存に失敗: ${err.message}`);
      return false;
    }
  } catch (error) {
    alert("通信エラーが発生しました: " + error.message);
    return false;
  }
}

function buildRecipeCardHtml(recipe) {
  const ingredientsHtml = recipe.ingredients
    .map((ing) => `<li>${escapeHtml(ing)}</li>`)
    .join("");
  const stepsHtml = recipe.steps
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(recipe.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: radial-gradient(circle at top, #222 0, #050505 55%, #000 100%);
  color: #f5f5f5;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 1rem;
}
.card {
  max-width: 900px;
  width: 100%;
  border-radius: 0.9rem;
  border: 1px solid #333;
  background: radial-gradient(circle at top left, #2a1515 0, #050505 55%, #000 100%);
  padding: 0.9rem;
  box-sizing: border-box;
  position: relative;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  border-bottom: 1px dashed rgba(255,255,255,0.08);
  padding-bottom: 0.4rem;
  padding-right: 4rem;
}
.card-title { font-size: 1.05rem; font-weight: 700; letter-spacing: 0.06em; }
.card-subtitle { font-size: 0.75rem; color: #aaaaaa; }
.card-tag { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.15); color: #ff7043; }

.edit-btn {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  border: 1px solid #333;
  background: #151515;
  color: #f5f5f5;
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.edit-btn:hover {
  background: #222;
  border-color: #ff7043;
}

.card-body { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.75rem; }
.card-top-row { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.3fr); gap: 0.75rem; }

.card-image { width: 100%; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.12); object-fit: cover; background: #111; aspect-ratio: 4 / 3; }
.section-title { font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase; color: #aaaaaa; margin-bottom: 0.25rem; }
.ingredients, .steps { font-size: 0.8rem; line-height: 1.5; }
.ingredients ul, .steps ol { margin: 0.2rem 0 0; padding-left: 1.1rem; }
.ingredients li, .steps li { margin-bottom: 0.15rem; }
.card-footer { display: flex; justify-content: flex-end; margin-top: 0.2rem; }
.card-note { font-size: 0.7rem; color: #aaaaaa; }

@media (max-width: 720px) {
  .card-top-row { grid-template-columns: 1fr; }
}
</style>
</head>
<body>
<div class="card">
  <button class="edit-btn" id="editBtn">編集</button>
  <div class="card-header">
    <div>
      <div class="card-title">${escapeHtml(recipe.title)}</div>
      <div class="card-subtitle">${escapeHtml(recipe.subtitle)}</div>
    </div>
    <div class="card-tag">${escapeHtml(recipe.genre)}</div>
  </div>
  <div class="card-body">
    <div class="card-top-row">
      <div>
        <img id="cardImage" class="card-image" src="${recipe.image || ''}" alt="レシピ画像" />
      </div>
      <div>
        <div class="section-title">材料</div>
        <div class="ingredients"><ul>${ingredientsHtml}</ul></div>
      </div>
    </div>
    <div>
      <div class="section-title" style="margin-top:0.5rem;">作り方</div>
      <div class="steps"><ol>${stepsHtml}</ol></div>
    </div>
  </div>
  <div class="card-footer">
    <span class="card-note">ゴリのレシピ</span>
  </div>
</div>

<script>
document.getElementById("editBtn").addEventListener("click", () => {
  const target = {
    genre: "${recipe.genre}",
    title: "${recipe.title.replace(/"/g, '\\"')}",
    subtitle: "${recipe.subtitle.replace(/"/g, '\\"')}",
    ingredients: ${JSON.stringify(recipe.ingredients)},
    steps: ${JSON.stringify(recipe.steps)},
    image: "${recipe.image.replace(/"/g, '\\"')}"
  };
  sessionStorage.setItem("edit_recipe_target", JSON.stringify(target));
  window.location.href = "../index.html?mode=edit";
});
</script>
</body>
</html>`;
}

function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function checkEditMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") === "edit") {
    const targetJson = sessionStorage.getItem("edit_recipe_target");
    if (targetJson) {
      try {
        const target = JSON.parse(targetJson);
        document.getElementById("inputGenre").value = target.genre || "主食";
        document.getElementById("inputTitle").value = target.title || "";
        document.getElementById("inputSubtitle").value = target.subtitle || "";
        document.getElementById("inputIngredients").value = (target.ingredients || []).join("\n");
        document.getElementById("inputSteps").value = (target.steps || []).join("\n");
        currentPreviewData = target;
        
        sessionStorage.removeItem("edit_recipe_target");
        
        openAddModal();
        document.getElementById("modalTitle").textContent = "レシピ編集";
      } catch (e) {
        console.error("編集データの復元に失敗しました:", e);
      }
    }
  }
}
