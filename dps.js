'use strcit';

var app = angular.module('paragon-dps-calc', ['nvd3']);

GENERAL_STATS_PRESETS = [
  {
    name: 'v28',
    damagePerPoint: 7.6,
    attackSpeedPerPoint: 6.5,
    critChancePerPoint: 0.03,
    initialCritBonus: 1.5,
  },
  {
    name: 'v29',
    damagePerPoint: 6.5,
    attackSpeedPerPoint: 5.5,
    critChancePerPoint: 0.03,
    initialCritBonus: 1.5,
  },
]

app.controller('Ctrl', function() {
  this.heros = HEROS;
  this.heroName = HEROS[0].name;
  this.generalPresets = GENERAL_STATS_PRESETS;
  this.generalPresetName = GENERAL_STATS_PRESETS[0].name;
  this.generalStats = null;
  this.heroStats = null;
  
  this.level = 15;
  this.extraCritBonus = false;
  this.damageP = 24;
  this.attackSpeedP = 14;
  this.critChanceP = 8;
  this.totalP = 0;
  
  this.damage = 0;
  this.attackSpeed = 0;
  this.critChance = 0;
  this.critBonus = 0;
  this.dps = 0;
  
  this.graphOptions = {
    chart: {
      type: 'lineChart',
      height: 800,
      x: function(d) { return d.x; },
      y: function(d) { return d.y; },
      useInteractiveGuideline: true,
      xAxis: {
        axisLabel: 'Total Points',
      },
      yAxis: {
        tickFormat: function(d) { return d3.format(',.0f')(d); },
        axisLabel: 'DPS',
      },
    },
  };
  this.graphData = [];
  
  this.update = function(updateTotal) {
    if (!this.heroStats || this.heroName != this.heroStats.name) {
      this.heroStats = angular.copy(this.heros.filter(function(h) {
        return h.name == this.heroName;
      }.bind(this))[0]);
    }
    if (!this.generalStats || this.generalPresetName != this.generalStats.name) {
      this.generalStats = angular.copy(this.generalPresets.filter(function(g) {
        return g.name == this.generalPresetName;
      }.bind(this))[0]);
    }
    updateTotal = updateTotal == null ? true : updateTotal;
    if (updateTotal) {
      this.totalP = (
        this.damageP + this.attackSpeedP + this.critChanceP + 3 * this.extraCritBonus);
    }
    this.critBonus = this.generalStats.initialCritBonus + 0.5 * this.extraCritBonus;
    this.damage = calcDamage(
        this.generalStats, this.heroStats, this.level, this.damageP);
    this.attackSpeed = calcAttackSpeed(
        this.generalStats, this.heroStats, this.level, this.attackSpeedP);
    this.critChance = calcCritChance(
        this.generalStats, this.heroStats, this.level, this.critChanceP);
    this.dps = calcDps(
      this.heroStats.initialCooldown, this.damage, this.attackSpeed,
      this.critChance,
      this.critBonus);
    this.graphData = this.calcGraphData();
  }.bind(this);
  
  this.findOptimal = function() {
    this.update(false);
    var best = solveForOptimal(
        this.generalStats, this.heroStats, this.level,
        this.totalP - 3 * this.extraCritBonus, this.critBonus);
    this.damageP = best.damageP;
    this.attackSpeedP = best.attackSpeedP;
    this.critChanceP = best.critChanceP;
    this.update();
  }.bind(this);
  
  this.calcGraphData = function() {
    var crit = {key: 'Optimal DPS(+50% Crit Bonus)', values: []};
    var noCrit = {key: 'Optimal DPS', values: []};
    for (var totalP = 0; totalP <= 60; totalP++) {
      if (totalP >= 3) {
        crit.values.push({
          x: totalP,
          y: solveForOptimal(
              this.generalStats, this.heroStats, this.level,
              totalP - 3, this.generalStats.initialCritBonus + 0.5).dps
        });
      }
      noCrit.values.push({
        x: totalP,
        y: solveForOptimal(
            this.generalStats, this.heroStats, this.level,
            totalP, this.generalStats.initialCritBonus).dps
      });
    }
    return [crit, noCrit];
  }.bind(this);
  
  this.update();
});

function solveForOptimal(generalStats, heroStats, level, totalP, critBonus) {
  var best = null;
  for (var d = 0; d <= totalP; d++) {
    for (var a = 0; a + d <= totalP; a++) {
      var c = totalP - d - a;
      var dps = calcDps(heroStats.initialCooldown,
        calcDamage(generalStats, heroStats, level, d),
        calcAttackSpeed(generalStats, heroStats, level, a),
        calcCritChance(generalStats, heroStats, level, c),
        critBonus);
      if (!best || dps > best.dps) {
        best = {damageP: d, attackSpeedP: a, critChanceP: c, dps: dps};
      }
    }
  }
  return best;
}

function calcDamage(generalStats, heroStats, level, damageP) {
  return (
      heroStats.initialDamage + heroStats.damageLevelGain * (level - 1) +
      generalStats.damagePerPoint * damageP * heroStats.damageScaling);
}

function calcAttackSpeed(generalStats, heroStats, level, attackSpeedP) {
  return (
      heroStats.initialAttackSpeed +
      heroStats.attackSpeedLevelGain * (level - 1) +
      generalStats.attackSpeedPerPoint * attackSpeedP);
}

function calcCritChance(generalStats, heroStats, level, critChanceP) {
  return generalStats.critChancePerPoint * critChanceP;
}

function calcDps(initialCooldown, damage, attackSpeed, critChance, critBonus) {
  var hitPerSec = attackSpeed / 100 / initialCooldown;
  return damage * hitPerSec * (1 + critChance * (critBonus - 1)); 
}
