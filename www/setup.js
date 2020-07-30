function submit() {
    const BASE_URL = "http://localhost:8080/";

    let other_letters = "";
    for (i = 1; i <= 6; i += 1) {
        other_letters += document.getElementById("other" + i).value;
    }

    let center = document.getElementById("center").value;

    window.location.href = BASE_URL +
        "?center=" +
        center.toUpperCase() +
        "&others=" +
        other_letters.toUpperCase();
}

document.getElementById("submit").onClick = submit;
