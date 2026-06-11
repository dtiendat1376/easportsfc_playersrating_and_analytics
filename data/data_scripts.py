import csv
import re


MALE_PATH = "data/male_players.csv"
EA_TEMPLATE_PATH = "data/ea_fc26_players.csv"
OUTPUT_PATH = "data/ea_fc25_players.csv"


def position_type(position):
    p = str(position).strip().upper()
    if p in {"ST", "CF", "LW", "RW"}:
        return "Attack"
    if p in {"CAM", "CM", "CDM", "LM", "RM"}:
        return "Midfielder"
    if p in {"CB", "LB", "RB", "LWB", "RWB", "GK"}:
        return "Defense"
    return ""


def split_play_styles(styles):
    items = [part.strip() for part in str(styles or "").split(",") if part.strip()]
    plus = [part[:-1].strip() for part in items if part.endswith("+")]
    normal = [part for part in items if not part.endswith("+")]
    return ",".join(normal), ",".join(plus)


def extract_id(url):
    value = str(url or "").rstrip("/")
    match = re.search(r"/(\d+)$", value)
    return match.group(1) if match else ""


def extract_cm(height):
    match = re.search(r"(\d+)cm", str(height or ""))
    return match.group(1) if match else ""


def extract_kg(weight):
    match = re.search(r"(\d+)kg", str(weight or ""))
    return match.group(1) if match else ""


def split_name(full_name):
    parts = str(full_name or "").strip().split()
    if not parts:
        return "", ""
    return parts[0], " ".join(parts[1:])


def main():
    with open(EA_TEMPLATE_PATH, newline="", encoding="utf-8-sig") as template_file:
        ea_columns = next(csv.reader(template_file))

    with open(MALE_PATH, newline="", encoding="utf-8-sig") as male_file:
        male_rows = list(csv.DictReader(male_file))

    direct_map = {
        "Rank": "rank",
        "OVR": "overallRating",
        "PAC": "pac",
        "SHO": "sho",
        "PAS": "pas",
        "DRI": "dri",
        "DEF": "def",
        "PHY": "phy",
        "Acceleration": "acceleration",
        "Sprint Speed": "sprintSpeed",
        "Positioning": "positioning",
        "Finishing": "finishing",
        "Shot Power": "shotPower",
        "Long Shots": "longShots",
        "Volleys": "volleys",
        "Penalties": "penalties",
        "Vision": "vision",
        "Crossing": "crossing",
        "Free Kick Accuracy": "freeKickAccuracy",
        "Short Passing": "shortPassing",
        "Long Passing": "longPassing",
        "Curve": "curve",
        "Dribbling": "dribbling",
        "Agility": "agility",
        "Balance": "balance",
        "Reactions": "reactions",
        "Ball Control": "ballControl",
        "Composure": "composure",
        "Interceptions": "interceptions",
        "Heading Accuracy": "headingAccuracy",
        "Def Awareness": "defensiveAwareness",
        "Standing Tackle": "standingTackle",
        "Sliding Tackle": "slidingTackle",
        "Jumping": "jumping",
        "Stamina": "stamina",
        "Strength": "strength",
        "Aggression": "aggression",
        "Position": "position",
        "Alternative positions": "alternatePositions",
        "Nation": "nationality",
        "Team": "team",
        "League": "leagueName",
        "GK Diving": "gkDiving",
        "GK Handling": "gkHandling",
        "GK Kicking": "gkKicking",
        "GK Positioning": "gkPositioning",
        "GK Reflexes": "gkReflexes",
    }

    transformed_rows = []
    for row in male_rows:
        out_row = {column: "" for column in ea_columns}

        for source, destination in direct_map.items():
            out_row[destination] = row.get(source, "")

        out_row["id"] = extract_id(row.get("url", ""))

        first_name, last_name = split_name(row.get("Name", ""))
        out_row["firstName"] = first_name
        out_row["lastName"] = last_name
        out_row["commonName"] = ""
        out_row["birthdate"] = ""

        out_row["height"] = extract_cm(row.get("Height", ""))
        out_row["weight"] = extract_kg(row.get("Weight", ""))

        out_row["skillMoves"] = row.get("Skill moves", "")
        out_row["weakFootAbility"] = row.get("Weak foot", "")

        preferred = row.get("Preferred foot", "")
        out_row["preferredFoot"] = "1" if preferred == "Right" else "2" if preferred == "Left" else ""

        out_row["positionType"] = position_type(out_row["position"])

        play_styles, play_styles_plus = split_play_styles(row.get("play style", ""))
        out_row["playStyles"] = play_styles
        out_row["playStylesPlus"] = play_styles_plus

        transformed_rows.append(out_row)

    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=ea_columns)
        writer.writeheader()
        writer.writerows(transformed_rows)

    print("Written {}".format(OUTPUT_PATH))
    print("Rows: {}".format(len(transformed_rows)))
    print("Columns: {}".format(len(ea_columns)))


if __name__ == "__main__":
    main()
