export const state = {
  rawPlayers: [],
  filteredPlayers: [],
  datasets: {
    fc26: [],
    fc25: [],
  },
};

export const rankingLabels = {
  overall:     "Overall",
  position:    "Position",
  league:      "League",
  nationality: "Nationality",
  attacking:   "Attacking Stats",
  defending:   "Defending Stats",
  physical:    "Physical Stats",
  goalkeeping: "Goalkeeping Stats",
};

export const formationMap = {
  "4-3-3":   ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "CAM", "RW", "ST", "LW"],
  "4-2-3-1": ["GK", "RB", "CB", "CB", "LB", "CDM", "CDM", "RW", "CAM", "LW", "ST"],
  "4-4-2":   ["GK", "RB", "CB", "CB", "LB", "RM", "CM", "CM", "LM", "ST", "ST"],
  "3-5-2":   ["GK", "CB", "CB", "CB", "RM", "CM", "CDM", "CM", "LM", "ST", "ST"],
  "4-3-2-1": ["GK", "RB", "CB", "CB", "LB", "CM", "CDM", "CM", "AM", "AM", "ST"],
  "3-4-3":   ["GK", "CB", "CB", "CB", "RM", "CM", "CM", "LM", "RW", "ST", "LW"],
  "4-1-4-1": ["GK", "RB", "CB", "CB", "LB", "DM", "AM", "AM", "LM", "RM", "ST"]
};

export const compareMetrics = [
  "overallRating", "pac", "sho", "pas", "dri", "def", "phy",
  "acceleration", "sprintSpeed", "finishing", "positioning",
  "interceptions", "standingTackle", "strength", "stamina",
  "gkDiving", "gkHandling", "gkKicking", "gkPositioning", "gkReflexes",
  "playStyles", "playStylesPlus",
];