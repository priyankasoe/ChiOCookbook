const CSV_PATH = "recipe-data/recipedata.csv";

const columns = {
  contributor: "What is your name?",
  upload: "Is your recipe a file/pdf/picture? Upload it here!",
  recipe: "Or copy and paste/write your recipe here!",
  story: "Who's recipe is this? Share a little about this person/what they mean to you/memories:)",
  picture: "Please share a picture of this person to include in the cookbook!"
};

const iconSet = ["🍰", "🥣", "🍪", "☕", "🍝", "🥑", "🥘", "🍲", "🧁", "🍋", "🥖", "🍽️"];

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift().map((header) => header.trim());
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function firstRecipeLine(recipeText) {
  const candidate = recipeText
    .split(/\n+/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("-") && !/^\d/.test(line));

  if (!candidate || candidate.length > 60 || /[.!?]$/.test(candidate)) {
    return "";
  }

  return candidate;
}

function titleFromStory(story, index) {
  const lower = story.toLowerCase();
  if (lower.includes("guacamole") || lower.includes("guac")) return "Family Lake House Guacamole";
  if (lower.includes("biscotti")) return "Nonna's Biscotti";
  if (lower.includes("spaghetti") || lower.includes("espagueti")) return "Espagueti Verde";
  if (lower.includes("dumpling")) return "Yiayia's Dumplings";
  if (lower.includes("chocolate sheet cake")) return "Great Grandma's Chocolate Sheet Cake";
  if (lower.includes("christmas cookie")) return "Aunt's Christmas Cookies";
  if (lower.includes("coffee cake")) return "Family Coffee Cake";
  if (lower.includes("gumbo")) return "Louisiana Family Gumbo";
  if (lower.includes("favorite dessert")) return "Great Grandma's Favorite Dessert";
  if (lower.includes("family event")) return "Family Event Favorite";
  if (lower.includes("grandma")) return "Grandma's Kitchen Recipe";
  if (lower.includes("mom")) return "Mom's Family Recipe";
  return `Family Recipe ${index + 1}`;
}

function cleanText(text) {
  return text.replace(/\u00a0/g, " ").trim();
}

function buildRecipes(rows) {
  return rows.map((row, index) => {
    const recipeText = cleanText(row[columns.recipe] || "");
    const story = cleanText(row[columns.story] || "");
    const title = firstRecipeLine(recipeText) || titleFromStory(story, index);
    const upload = cleanText(row[columns.upload] || "");

    return {
      id: index,
      title,
      contributor: cleanText(row[columns.contributor] || "Chi Omega Sister"),
      story,
      recipeText,
      hasUpload: Boolean(upload),
      icon: iconSet[index % iconSet.length]
    };
  });
}

function sortRecipesForDisplay(recipes) {
  return [...recipes].sort((first, second) => {
    if (Boolean(first.recipeText) === Boolean(second.recipeText)) {
      return first.id - second.id;
    }

    return first.recipeText ? -1 : 1;
  });
}

async function loadRecipes() {
  const response = await fetch(CSV_PATH);
  if (!response.ok) {
    throw new Error("Could not load recipe CSV.");
  }
  const csv = await response.text();
  return buildRecipes(parseCsv(csv));
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function renderIndex(recipes) {
  const grid = document.querySelector("#recipe-grid");
  const count = document.querySelector("#recipe-count");
  const sortedRecipes = sortRecipesForDisplay(recipes);
  if (!grid) return;

  if (count) {
    count.textContent = sortedRecipes.length;
  }

  grid.innerHTML = sortedRecipes
    .map((recipe) => `
      <a class="recipe-card" href="recipe.html?id=${recipe.id}">
        <div class="recipe-art" aria-hidden="true">${recipe.icon}</div>
        <div class="recipe-body">
          <span class="tag">${recipe.recipeText ? "Full recipe" : "Story + upload"}</span>
          <h3>${escapeHtml(recipe.title)}</h3>
          <p class="contributor">Shared by ${escapeHtml(recipe.contributor)}</p>
          <p class="story-preview">${escapeHtml(truncate(recipe.story, 145))}</p>
        </div>
      </a>
    `)
    .join("");
}

function renderRecipe(recipes) {
  const detail = document.querySelector("#recipe-detail");
  if (!detail) return;

  const id = Number(new URLSearchParams(window.location.search).get("id"));
  const recipe = recipes.find((item) => item.id === id);

  if (!recipe) {
    document.title = "Recipe not found | Chi Omega Cookbook";
    detail.innerHTML = `
      <section class="recipe-content">
        <h1 class="recipe-title">Recipe not found</h1>
        <p class="recipe-note">This cookbook page could not find that recipe. Return to the cookbook and choose another card.</p>
      </section>
    `;
    return;
  }

  document.title = `${recipe.title} | Chi Omega Cookbook`;
  detail.innerHTML = `
    <aside class="recipe-aside">
      <div class="recipe-art" aria-hidden="true">${recipe.icon}</div>
      <div class="aside-body">
        <span class="tag">${recipe.recipeText ? "Full recipe" : "Story + upload"}</span>
        <p class="contributor">Shared by ${escapeHtml(recipe.contributor)}</p>
        <p class="recipe-note">Image placeholder for now</p>
      </div>
    </aside>

    <article class="recipe-content">
      <h1 class="recipe-title">${escapeHtml(recipe.title)}</h1>
      <div class="memory-box">
        ${escapeHtml(recipe.story || "A family favorite shared with Chi Omega.")}
      </div>
      ${recipe.recipeText
        ? `<div class="recipe-text">${escapeHtml(recipe.recipeText)}</div>`
        : `<div class="empty-recipe">This submission included the recipe as a file upload. The website is leaving the Drive file out for now, so this page is ready for recipe text whenever you want to add it.</div>`
      }
    </article>
  `;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadRecipes()
  .then((recipes) => {
    renderIndex(recipes);
    renderRecipe(recipes);
  })
  .catch((error) => {
    const target = document.querySelector("#recipe-grid") || document.querySelector("#recipe-detail");
    if (target) {
      target.innerHTML = `<p class="loading">${escapeHtml(error.message)}</p>`;
    }
  });
