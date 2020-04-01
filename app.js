const sitesElement = document.querySelector(".sites");
const clockElement = document.querySelector(".clock");
const weatherElement = document.querySelector(".weather");
const dialogElement = document.querySelector(".dialog");
let sites = JSON.parse(localStorage.getItem("sites") || "[]");
let theme = localStorage.getItem("theme") || document.documentElement.setAttribute("data-theme", window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

const setTheme = (value) => {
  theme = value;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", value);
};

let editingSite = {
  name: "",
  url: "",
  icon: ""
};

const showDialog = (value) => {
  dialogElement.style.visibility = value ? "visible" : "hidden";

  let name = "";
  let url = "";
  let icon = "";
  if(editingSite){
    name = editingSite.name;
    url = editingSite.url;
    icon = editingSite.icon;
  }

  dialogElement.querySelector("#newName").value = name;
  dialogElement.querySelector("#newUrl").value = url;
  dialogElement.querySelector("#newIcon").value = icon;
};

const saveDialog = () => {
  const name = dialogElement.querySelector("#newName").value;
  let url = dialogElement.querySelector("#newUrl").value;
  const icon = dialogElement.querySelector("#newIcon").value;

  if(name === "" || url === ""){
    return alert("You must provide a name and url");
  }

  if(!url.startsWith("https://") && !url.startsWith("http://")){
    url = `https://${url}`;
  }

  if(editingSite){
    sites = sites.map((site) => {
      if(site === editingSite){
        site = {
          name,
          url,
          icon
        };
      }

      return site;
    });
    updateSites();
    editingSite = null;
  }else{
    if(sites.findIndex((_site) => _site.url === url) >= 0){
      return alert("site already exists with that url");
    }
    sites = sites.concat({
      name,
      url,
      icon
    });
    updateSites();
  }

  showDialog(false);
};

const deleteDialog = () => {
  if(!editingSite){
    return;
  }

  const _sites = JSON.parse(JSON.stringify(sites));
  _sites.splice(sites.findIndex((_site) => _site.url === editingSite.url), 1);
  sites = _sites;
  updateSites();

  editingSite = null;
  showDialog(false);
};

const updateClock = () => {
  const date = new Date();
  let apm = "am";
  if(date.getHours() >= 12){
    apm = "pm";
  }

  const hours = date.getHours() % 12;
  clockElement.innerText = `${hours === 0 ? 12 : hours}:${date.getMinutes() <= 9 ? `0${date.getMinutes()}` : date.getMinutes()}${apm}`;

  setTimeout(updateClock, 5000);
};

setTimeout(updateClock, 2000);

let latitude = 0;
let longitude = 0;
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition((position) => {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    updateWeather();
  });
}

const updateWeather = () => {
  fetch(`https://cors-anywhere.herokuapp.com/https://www.metaweather.com/api/location/search/?lattlong=${latitude},${longitude}`).then((res) => res.json()).then((res) => {
    fetch(`https://cors-anywhere.herokuapp.com/https://www.metaweather.com/api/location/${res[0].woeid}`).then((res) => res.json()).then((res) => {
      const temp = Math.round(res.consolidated_weather[0].the_temp / 5 * 9 + 32);
      const icon = res.consolidated_weather[0].weather_state_abbr;
      weatherElement.innerHTML = `${icon !== "" && `<img src="https://www.metaweather.com/static/img/weather/${icon}.svg" alt="">`} ${temp}°`;
    }).catch(console.error);
  }).catch(console.error);

  setTimeout(updateWeather, 300000); // update every 5 minutes
};

const swap = (array, a, b) => {
  const temp = array[a];
  array[a] = array[b];
  array[b] = temp;

  return array;
};

const search = (query) => {
  window.location.href = `https://duckduckgo.com/?q=${query}`;
};

const copySites = (clipboardData) => {
  clipboardData.setData("text/plain", JSON.stringify(sites));
};

document.onpaste = (e) => {
  const clipboardData = e.clipboardData || window.clipboardData;

  try{
    const data = JSON.parse(clipboardData.getData("Text")).filter((site) => site.name && site.url && sites.findIndex((_site) => _site.url === site.url) < 0);
    if(data.length === 0){
      console.log("a");
      return;
    }

    e.stopPropagation();
    e.preventDefault();

    sites = sites.concat(data);
    updateSites();
  }catch(err){
    return console.error(err);
  }
};

document.oncopy = (e) => {
  if(document.getSelection()?.toString() === ""){
    e.preventDefault();
    copySites(e.clipboardData);
  }
};

const drop = (e, site) => {
  e.preventDefault();
  const otherSite = JSON.parse(e.dataTransfer.getData("text"));

  const _sites = JSON.parse(JSON.stringify(sites));
  sites = swap(_sites, sites.findIndex((_site) => _site.url === otherSite.url), sites.indexOf(site));
  updateSites();
};

const siteTemplate = document.createElement("template");
siteTemplate.innerHTML = `
  <div class="btn--icon edit">⁝</div>
  <span>
    <img alt="">
    <div></div>
  </span>
`;
class Site extends HTMLAnchorElement{
  constructor(props){
    super();

    this.href = props.site.url;
    this.rel = "noopener noreferrer";
    this.draggable = true;
    this.ondrop = (e) => drop(e, props.site);
    this.ondragover = (e) => e.preventDefault();
    this.ondragstart = (e) => e.dataTransfer.setData("text", JSON.stringify(props.site));

    this.appendChild(siteTemplate.content.cloneNode(true));

    this.querySelector(".edit").onclick = (e) => {
      e.preventDefault();
      props.onEditClick();
    };
    this.querySelector("img").src = props.site.icon || `https://www.google.com/s2/favicons?domain=${props.site.url}`;
    this.querySelector("span > div").innerText = props.site.name;
  }
}
customElements.define("app-site", Site, {extends: "a"});

const updateSites = () => {
  localStorage.setItem("sites", JSON.stringify(sites));

  let checkUnchanged = sitesElement.childElementCount > 1;
  const prevHrefs = [...sitesElement.children].map((element) => element.href.replace(/\/+$/g, ""));
  if(sitesElement.children.length - 1 > sites.length){
    checkUnchanged = false;
    for(const child of [...sitesElement.children]){
      if(child.href){
        child.remove();
      }
    }
  }

  for(let i = 0; i < sites.length; i++){
    const site = sites[i];
    if(checkUnchanged && i === prevHrefs.indexOf(site.url.replace(/\/+$/g, ""))){
      continue;
    }

    sitesElement.insertBefore(new Site({
      site,
      onEditClick: () => {
        editingSite = site;
        showDialog(true);
      }
    }), sitesElement.children[i]);
    if(checkUnchanged && sitesElement.children[i + 1] !== sitesElement.lastElementChild){
      sitesElement.removeChild(sitesElement.children[i + 1]);
    }
  }
}

updateSites();
