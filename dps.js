'use strcit';

let app = angular.module('paragon-dps-calc', ['nvd3']);

app.controller('Ctrl', function() {
  this.heros = HEROS;
  this.heroName = HEROS[0].name;
  this.basicStats = {};
  
  this.level = 15;
  this.useCritBonus = false;
  this.damageP = 24;
  this.attackSpeedP = 14;
  this.critChanceP = 8;
  this.totalP = 0;
  
  this.damage = 0;
  this.attackSpeed = 0;
  this.critChance = 0;
  this.critBonus = 200;
  this.dps = 0;
  
  this.graphOptions = {
    chart: {
      type: 'lineChart',
      height: 800,
      x: d => d.x,
      y: d => d.y,
      useInteractiveGuideline: true,
      xAxis: {
        axisLabel: 'Total Points',
      },
      yAxis: {
        tickFormat: d => d3.format(',.0f')(d),
        axisLabel: 'DPS',
      },
    },
  };
  this.graphData = [];
  
  this.update = function(updateTotal) {
    updateTotal = updateTotal == null ? true : updateTotal;
    if (updateTotal) {
      this.totalP = (
        this.damageP + this.attackSpeedP + this.critChanceP + 3 * this.useCritBonus);
    }
    this.critBonus = 200 + 50 * this.useCritBonus;
    this.basicStats = angular.copy(this.heros.filter(h => h.name == this.heroName)[0]);
    this.damage = calcDamage(this.basicStats, this.level, this.damageP);
    this.attackSpeed = calcAttackSpeed(this.basicStats, this.level, this.attackSpeedP);
    this.critChance = calcCritChance(this.basicStats, this.level, this.critChanceP);
    this.dps = calcDps(
      this.basicStats.initialCooldown, this.damage, this.attackSpeed, this.critChance,
      this.critBonus / 100);
    this.graphData = this.calcGraphData();
  }.bind(this);
  
  this.findOptimal = function() {
    this.update(false);
    let best = solveForOptimal(this.basicStats, this.level, this.totalP - 3 * this.useCritBonus, this.critBonus / 100);
    this.damageP = best.damageP;
    this.attackSpeedP = best.attackSpeedP;
    this.critChanceP = best.critChanceP;
    this.update();
  }.bind(this);
  
  this.calcGraphData = function() {
    let crit = {key: 'Optimal DPS(+50% Crit Bonus)', values: []};
    let noCrit = {key: 'Optimal DPS', values: []};
    for (let totalP = 0; totalP <= 60; totalP++) {
      if (totalP >= 3) {
        crit.values.push({
          x: totalP,
          y: solveForOptimal(this.basicStats, this.level, totalP - 3, 2.5).dps
        });
      }
      noCrit.values.push({
        x: totalP,
        y: solveForOptimal(this.basicStats, this.level, totalP, 2).dps
      });
    }
    return [crit, noCrit];
  }.bind(this);
  
  this.update();
});

function solveForOptimal(basicStats, level, totalP, critBonus) {
  let best = null;
  for (let d = 0; d <= totalP; d++) {
    for (let a = 0; a + d <= totalP; a++) {
      let c = totalP - d - a;
      let dps = calcDps(basicStats.initialCooldown,
        calcDamage(basicStats, level, d),
        calcAttackSpeed(basicStats, level, a),
        calcCritChance(basicStats, level, c),
        critBonus);
      if (!best || dps > best.dps) {
        best = {damageP: d, attackSpeedP: a, critChanceP: c, dps: dps};
      }
    }
  }
  return best;
}

function calcDamage(basicStats, level, damageP) {
  return basicStats.initialDamage + basicStats.damageLevelGain * (level - 1) + 7.58 * damageP;
}

function calcAttackSpeed(basicStats, level, attackSpeedP) {
  return basicStats.initialAttackSpeed + basicStats.attackSpeedLevelGain * (level - 1) + 6.5 * attackSpeedP;
}

function calcCritChance(basicStats, level, critChanceP) {
  return 0.03 * critChanceP;
}

function calcDps(initialCooldown, damage, attackSpeed, critChance, critBonus) {
  let hitPerSec = attackSpeed / 100 / initialCooldown;
  return damage * hitPerSec * (1 + critChance * (critBonus - 1)); 
}
