import { APP_MODE } from "./config.js";
import { KnockoutService } from "../modules/knockoutStage.js";
let knockoutService; // global service for knockout stage
import { Team } from "../models/team.js";
import { Group } from "../models/group.js";
import { Match } from "../models/match.js";

class GroupService {
  constructor() {
    this.teams = [];
    this.groups = [];
    this.matches = [];
  }

  async loadData() {
    const [teamsRes, groupsRes] = await Promise.all([
      fetch(`../data/${APP_MODE === 'test' ? 'teams_test' : 'teams'}.json`),
      fetch(`../data/${APP_MODE === 'test' ? 'groups_test' : 'groups'}.json`)
    ]);
    const teamsData = await teamsRes.json();
    const groupsData = await groupsRes.json();
    this.teams = teamsData.map(t => new Team(t.id, t.name, t.flagUrl));
    this.groups = groupsData.map(g => {
      const groupTeams = g.teamIds.map(id => this.teams.find(t => t.id === id)).filter(Boolean);
      return new Group(g.name, groupTeams);
    });
    this.generateSchedule();
    // Initialize knockout bracket after groups loaded
    const qualified = this.getQualifiedTeams();
    knockoutService = new KnockoutService();
    await knockoutService.loadData();
    knockoutService.setQualifiedTeams(qualified);
    knockoutService.renderBracket();
  }

  // round‑robin schedule within each group (each pair plays once)
  generateSchedule() {
    let matchId = 1;
    this.groups.forEach(group => {
      const teams = group.teams;
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const home = teams[i];
          const away = teams[j];
          const date = new Date(); // placeholder
          const match = new Match(`M${matchId++}`, home, away, date.toISOString());
          group.addMatch(match);
          this.matches.push(match);
        }
      }
    });
  }

  getGroups() {
    return this.groups;
  }

  getMatches() {
    return this.matches;
  }

  recordResult(matchId, homeGoals, awayGoals) {
    const match = this.matches.find(m => m.id === matchId);
    if (!match) throw new Error("Match not found");
    if (homeGoals < 0 || awayGoals < 0) throw new Error("Goals must be non‑negative");
    match.setResult(homeGoals, awayGoals);
  }

  /**
   * Return an array of qualified teams ordered by group position (first place of each group followed by second place).
   * @param {number} perGroup - Number of qualified teams per group (default 2).
   * @returns {Array} Array of Team objects.
   */
  /**
   * Return standings for a specific group name.
   * @param {string} groupName - Name of the group (e.g., 'A').
   * @returns {Array} Standings array from Group.getStandings().
   */
  getStandings(groupName) {
    const group = this.groups.find(g => g.name === groupName);
    if (!group) throw new Error(`Group ${groupName} not found`);
    return group.getStandings();
  }
  getQualifiedTeams(perGroup = 2) {
    const qualified = [];
    this.groups.forEach(group => {
      const top = group.getQualifiedTeams(perGroup);
      qualified.push(...top);
    });
    return qualified;
  }
  }


/** UI Rendering **/
function renderGroups(service) {
  const container = document.getElementById("groupsContainer");
  container.innerHTML = "";
  service.getGroups().forEach(group => {
    const standings = service.getStandings(group.name);
    const table = document.createElement("table");
    table.className = "group-table";
    const caption = document.createElement("caption");
    caption.textContent = `Grupo ${group.name}`;
    table.appendChild(caption);
    const header = document.createElement("tr");
    ["Pos", "Equipo", "PJ", "GF", "GC", "DG", "Pts"].forEach(txt => {
      const th = document.createElement("th");
      th.textContent = txt;
      header.appendChild(th);
    });
    table.appendChild(header);
    standings.forEach((row, idx) => {
      const tr = document.createElement("tr");
      const cells = [
        idx + 1,
        row.team.name,
        row.team.name, // placeholder for matches played (computed later if needed)
        row.gf,
        row.ga,
        row.gd,
        row.points
      ];
      cells.forEach(val => {
        const td = document.createElement("td");
        td.textContent = val;
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    container.appendChild(table);
  });
}

function renderMatches(service) {
  const container = document.getElementById("matchesList");
  container.innerHTML = "";
  service.getMatches().forEach(match => {
    const div = document.createElement("div");
    div.className = "match-item";
    const label = document.createElement("label");
    label.textContent = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
    const homeInput = document.createElement("input");
    homeInput.type = "number";
    homeInput.min = "0";
    homeInput.value = match.homeGoals ?? "";
    homeInput.style.width = "40px";
    const awayInput = document.createElement("input");
    awayInput.type = "number";
    awayInput.min = "0";
    awayInput.value = match.awayGoals ?? "";
    awayInput.style.width = "40px";
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Guardar";
    saveBtn.addEventListener("click", () => {
      const hg = parseInt(homeInput.value, 10);
      const ag = parseInt(awayInput.value, 10);
      if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) {
        alert("Goles deben ser números no negativos");
        return;
      }
      try {
        service.recordResult(match.id, hg, ag);
        renderGroups(service);
        if (knockoutService) {
          knockoutService.setQualifiedTeams(service.getQualifiedTeams());
          knockoutService.renderBracket();
        }
        alert("Resultado guardado");
      } catch (e) {
        alert(e.message);
      }
    });
    div.appendChild(label);
    div.appendChild(document.createTextNode(" "));
    div.appendChild(homeInput);
    div.appendChild(document.createTextNode(" - "));
    div.appendChild(awayInput);
    div.appendChild(document.createTextNode(" "));
    div.appendChild(saveBtn);
    container.appendChild(div);
  });
}

  document.addEventListener("DOMContentLoaded", async () => {
    const service = new GroupService();
    await service.loadData();
    // expose globally for other modules (e.g., statistics)
    window.groupService = service;
    renderGroups(service);
    renderMatches(service);
  });
