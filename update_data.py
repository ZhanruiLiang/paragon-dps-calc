import re
import json
import sys
import urllib

import bs4


HERO_LIST_ADDR = 'http://paragon.wiki/Heroes'
HERO_ADDR_TEMPLATE = 'http://paragon.wiki/{hero}'


def is_hero_name(name):
  return name.replace(' ', '') and name != 'Search'


def get_hero_names():
  html = urllib.urlopen(HERO_LIST_ADDR).read()
  text = bs4.BeautifulSoup(html, 'lxml').get_text()
  names = re.findall(r'(?<=\n\n\n\n)([\w.&-_ ]+)(?:\n\n\n\n)', text)
  return filter(is_hero_name, names)


def get_hero_stats(name):
  addr = HERO_ADDR_TEMPLATE.format(hero=name.replace(' ', '_'))
  print >> sys.stderr, 'Scraping from {} ...'.format(addr)
  text = bs4.BeautifulSoup(urllib.urlopen(addr).read(), 'lxml').get_text()
  maybe_group1 = lambda r, default: r.group(1) if r else default
  return {
    'name': name,
    'initialDamage': float(
        re.search(r'(?:Physical|Energy)\s+Damage: ([\d.]+)', text).group(1)),
    'damageScaling': float(
        re.search(r'(?:Physical|Energy)\s+Damage\s+Scaling: ([\d.]+)', text).group(1)),
    'initialAttackSpeed': 100,
    'damageLevelGain': float(maybe_group1(
        re.search(r'Damage Increase per Level:\s+([\d.]+)', text), 0)),
    'attackSpeedLevelGain': float(maybe_group1(
        re.search(r'Attack Speed Level Bonus:\s+\(\+([\d.]+)%\)', text, re.M), 0)),
    'initialCooldown': float(re.search(r'Cooldown:\s+([\d.]+)', text).group(1)),
  }


def gen_hero_js():
  heros = sorted(get_hero_names())
  data = map(get_hero_stats, heros)
  return 'HEROS = ' + json.dumps(data, indent=2)


if __name__ == '__main__':
  print gen_hero_js()
