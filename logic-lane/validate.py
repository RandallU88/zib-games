#!/usr/bin/env python3
"""Forge solver for Logic Lane. Each grid must have exactly one solution
from its clue logic alone, and that solution must match the given solution.
Does not edit puzzle content; it only reports problems.
"""
from __future__ import annotations
import itertools, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

def load_puzzles(path: Path):
    text = path.read_text(encoding="utf-8")
    if path.suffix == ".js":
        # Extract the JSON assigned to LOGIC_LANE_DATA
        start = text.find("root.LOGIC_LANE_DATA = ")
        if start < 0:
            raise SystemExit("puzzles.js does not contain LOGIC_LANE_DATA")
        start = text.find("{", start)
        end = text.rfind("};")
        data = json.loads(text[start:end + 1])
        return data["logic_grids"]
    data = json.loads(text)
    return data["logic_grids"] if isinstance(data, dict) else data

def lookup_item(puzzle, item_id):
    for cat in puzzle["categories"]:
        for it in cat["items"]:
            if it["id"] == item_id:
                return cat, it
    return None, None

def permutations_for(puzzle):
    people = [i["id"] for i in puzzle["categories"][0]["items"]]
    cats = puzzle["categories"][1:]
    item_lists = [[i["id"] for i in c["items"]] for c in cats]
    for perms in itertools.product(*[itertools.permutations(items) for items in item_lists]):
        owner = {p: p for p in people}
        assign = {}
        for cat, perm in zip(cats, perms):
            for person, item in zip(people, perm):
                owner[item] = person
                assign[(person, cat["id"])] = item
        yield owner, assign

def value_of(puzzle, owner, assign, ref, cat_id):
    person = owner[ref]
    item_id = assign[(person, cat_id)]
    cat = next(c for c in puzzle["categories"] if c["id"] == cat_id)
    for idx, it in enumerate(cat["items"]):
        if it["id"] == item_id:
            if cat.get("numeric"):
                return it["value"]
            return idx
    raise KeyError(item_id)

def logic_ok(puzzle, owner, assign, L):
    t = L["type"]
    people = [i["id"] for i in puzzle["categories"][0]["items"]]
    if t == "all":
        return all(logic_ok(puzzle, owner, assign, x) for x in L["of"])
    if t == "is":
        return owner[L["a"]] == owner[L["b"]]
    if t == "not":
        return owner[L["a"]] != owner[L["b"]]
    if t == "not_any":
        return all(owner[L["a"]] != owner[b] for b in L["b"])
    if t == "in":
        return owner[L["a"]] in {owner[b] for b in L["b"]}
    if t == "times":
        return (
            owner[L["a"]] != owner[L["b"]]
            and value_of(puzzle, owner, assign, L["a"], L["cat"])
            == L["k"] * value_of(puzzle, owner, assign, L["b"], L["cat"])
        )
    if t == "times_some":
        mine = value_of(puzzle, owner, assign, L["a"], L["cat"])
        return any(
            mine == L["k"] * value_of(puzzle, owner, assign, q, L["cat"])
            for q in people
            if q != owner[L["a"]]
        )
    if t == "product":
        owners = {owner[L[x]] for x in "abc"}
        return (
            len(owners) == 3
            and value_of(puzzle, owner, assign, L["a"], L["cat"])
            == value_of(puzzle, owner, assign, L["b"], L["cat"])
            * value_of(puzzle, owner, assign, L["c"], L["cat"])
        )
    if t == "greatest":
        v = value_of(puzzle, owner, assign, L["a"], L["cat"])
        return all(v >= value_of(puzzle, owner, assign, q, L["cat"]) for q in people)
    if t == "least":
        v = value_of(puzzle, owner, assign, L["a"], L["cat"])
        return all(v <= value_of(puzzle, owner, assign, q, L["cat"]) for q in people)
    if t == "less":
        return value_of(puzzle, owner, assign, L["a"], L["cat"]) < value_of(
            puzzle, owner, assign, L["b"], L["cat"]
        )
    if t == "next":
        return value_of(puzzle, owner, assign, L["b"], L["cat"]) == value_of(
            puzzle, owner, assign, L["a"], L["cat"]
        ) + 1
    if t == "odd":
        return value_of(puzzle, owner, assign, L["a"], L["cat"]) % 2 == 1
    raise ValueError("unknown logic type: " + t)

def solve(puzzle, skip=None):
    sols = []
    clues = puzzle["clues"]
    for owner, assign in permutations_for(puzzle):
        ok = True
        for i, clue in enumerate(clues):
            if skip is not None and i == skip:
                continue
            if not logic_ok(puzzle, owner, assign, clue["logic"]):
                ok = False
                break
        if ok:
            cats = puzzle["categories"][1:]
            people = [it["id"] for it in puzzle["categories"][0]["items"]]
            sols.append({p: {c["id"]: assign[(p, c["id"])] for c in cats} for p in people})
    return sols

def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "puzzles.js"
    puzzles = load_puzzles(path)
    bad = []
    print(f"Checking {len(puzzles)} puzzles in {path.name} with the Logic Lane solver.\n")
    for p in puzzles:
        tag = p.get("id", "?")
        try:
            sols = solve(p)
        except Exception as e:
            bad.append(tag)
            print(f"FAIL  {tag:10} solver error: {e}")
            continue
        expected = p.get("solution")
        match = len(sols) == 1 and sols[0] == expected
        if len(sols) != 1:
            bad.append(tag)
            print(f"FAIL  {tag:10} {p.get('kid')} {p.get('level')} {p.get('shape')}: "
                  f"expected exactly one solution from the clues, found {len(sols)}.")
            continue
        if not match:
            bad.append(tag)
            print(f"FAIL  {tag:10} unique solution does not match the given solution.")
            print(f"      solver:  {sols[0]}")
            print(f"      listed:  {expected}")
            continue
        print(f"OK    {tag:10} {p.get('kid','?'):9} {p.get('level','?'):9} {p.get('shape','?'):7} "
              f"clues={len(p['clues'])}  1 solution")
    print()
    if bad:
        print(f"{len(bad)} puzzle(s) did not have exactly one matching solution: {', '.join(bad)}")
        print("Content was not edited. These need a look from Lorelai.")
        sys.exit(1)
    print(f"All {len(puzzles)} puzzles have exactly one solution from their clues.")
    sys.exit(0)

if __name__ == "__main__":
    main()
