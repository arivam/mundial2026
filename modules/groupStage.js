// modules/groupStage.js
// Service for handling group stage logic: loading data, generating schedule, recording results, and computing standings.

const fs = require('fs');
const path = require('path');
const Team = require('../models/team');
const Group = require('../models/group');
const Match = require('../models/match');

class GroupService {
  constructor() {
    this.teams = [];
    this.groups = [];
    this.matches = [];
    this.loadData();
    this.generateSchedule();
  }

  // Load teams and groups from JSON files
  loadData() {
    const dataDir = path.join(__dirname, '..', 'data');
    const teamsPath = path.join(dataDir, 'teams.json');
    const groupsPath = path.join(dataDir, 'groups.json');
    const rawTeams = JSON.parse(fs.readFileSync(teamsPath, 'utf8'));
    const rawGroups = JSON.parse(fs.readFileSync(groupsPath, 'utf8'));

    // Create Team instances
    this.teams = rawTeams.map(t => new Team(t.id, t.name, t.flagUrl));

    // Build Group instances, assigning Team objects
    this.groups = rawGroups.map(g => {
      const groupTeams = g.teamIds.map(id => this.teams.find(t => t.id === id)).filter(Boolean);
      return new Group(g.name, groupTeams);
    });
  }

  // Generate round‑robin schedule for each group (each pair plays once)
  generateSchedule() {
    let matchId = 1;
    this.groups.forEach(group => {
      const teams = group.teams;
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const home = teams[i];
          const away = teams[j];
          const date = new Date(); // placeholder; in a real app you'd calculate dates
          const match = new Match(`M${matchId++}`, home, away, date.toISOString());
          group.addMatch(match);
          this.matches.push(match);
        }
      }
    });
  }

  // Public API
  getGroups() {
    return this.groups;
  }

  getMatches() {
    return this.matches;
  }

  // Record result for a given match id
  recordResult(matchId, homeGoals, awayGoals) {
    const match = this.matches.find(m => m.id === matchId);
    if (!match) throw new Error('Match not found');
    if (homeGoals < 0 || awayGoals < 0) throw new Error('Goals must be non‑negative');
    match.setResult(homeGoals, awayGoals);
  }

  // Get standings for a specific group name
  getStandings(groupName) {
    const group = this.groups.find(g => g.name === groupName);
    if (!group) throw new Error('Group not found');
    return group.getStandings();
  }
}

module.exports = GroupService;
