import { PlayResult, SpellingBeeGame } from "spelling-bee";
const fetch = require("node-fetch");
let $ = require("jquery");
let progressBar = require('progressbar.js')


const mw_url = 'http://gist.github.com/nicholas-miklaucic/dbf1687b6c5759a2aa1579347069a09c/raw/534bed607e98e7982bb5bf7d51dd16f7ff968f9a/main_words.txt';
const swears_url = 'http://gist.github.com/nicholas-miklaucic/dbf1687b6c5759a2aa1579347069a09c/raw/534bed607e98e7982bb5bf7d51dd16f7ff968f9a/swears.txt';

// let main_words = fs.readFileSync("~/programs/lexi/2of12inf.txt");
// let swears = fs.readFileSync("~/programs/lexi/swears.txt");

const VALID = 0;
const ALREADY_PLAYED = 1;
const INVALID_WORD = 2;
const INVALID_LENGTH = 3;
const INVALID_LETTERS = 4;

// from
// https://dev.to/ananyaneogi/create-a-dark-light-mode-switch-with-css-variables-34l8
// with modification

function toggleTheme(_) {
    if (document.documentElement.getAttribute('data-theme') === 'light') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark'); //add this
    }
    else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light'); //add this
    }
}

const currentTheme = localStorage.getItem('theme') ? localStorage.getItem('theme') : null;
if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
}



async function main() {
    const main_req = await fetch(mw_url);
    const swears_req = await fetch(swears_url);

    const main_words = await main_req.text();
    const swears = await swears_req.text();

    const url_params = new URLSearchParams(window.location.search);
    const center_letter = url_params.get('center').toLowerCase();
    const other_letters = url_params.get('others').toLowerCase();

    const game = SpellingBeeGame.new(other_letters, center_letter, main_words,
                                     swears);

    const max_score = game.max_score();
    $("#score-bar").attr("aria-valuemax", max_score);

    let curr_word = "";
    let curr_score = 0;
    let played_words = [];
    $("#curr-word").empty();
    $("#played-words").empty();

    let scoreBar = new progressBar.Line("#score-bar", {
        strokeWidth: 5,
        trailColor: '#dfdfdf',
        from: { color: '#6796E0' },
        to: { color: '#5755d9' },
        step: function(state, bar, attachment) {
            bar.path.setAttribute('stroke', state.color);
        },
    });

    function makeWordBtn(word) {
        let btn = "<a href='https://www.merriam-webster.com/dictionary/" + word;
        btn += "' class='btn btn-link btn-word' role='button' aria-label='Define' target='_blank'>";
        btn += word + "</a>";
        return btn;
    }

    function makeAlert(msg, toast_cls) {
        $("#alert-box").empty();
        $("#alert-box").append(`<div class="toast toast-` + toast_cls + `" mx-auto">
  <button class="btn btn-clear float-right" id="close-toast-btn"></button>` + msg +
 '</div>');
        $("#close-toast-btn").on("click", function (evt) {
            $("#alert-box").empty();
        });
    }

    function setScore(score) {
        scoreBar.set(score / max_score);
        let string = score.toString();
        if (score === 1) {
            string += " point";
        } else {
            string += " points";
        }
        $("#score").text(string);
    }

    function setNumPlayed(num) {
        let string = num.toString();
        if (num === 1) {
            string += " word";
        } else {
            string += " words";
        }
        $("#num-played").text(string);
    }

    function submit() {
        const result = game.play(curr_word);
        if (result === VALID) {
            played_words.push(curr_word);
            $("#played-words").append(makeWordBtn(curr_word));
            setNumPlayed(played_words.length);

            setScore(game.score());

            curr_word = "";
            $("#curr-word").empty();
        } else if (result === ALREADY_PLAYED) {
            makeAlert("Already played!", "warning");
            curr_word = "";
            $("#curr-word").empty();
        } else if (result === INVALID_WORD) {
            makeAlert("That word couldn't be found in the lexicon", "error");
            curr_word = "";
            $("#curr-word").empty();
        } else if (result === INVALID_LENGTH) {
            makeAlert("Words need to be at least 4 letters long", "error");
        } else if (result === INVALID_LETTERS) {
            makeAlert("Words must contain the center letter", "error");
        } else {
            makeAlert("A strange error occurred", "error");
            curr_word = "";
            $("#curr-word").empty();
        }
    }

    function makeSpan(letter) {
        if (letter === game.required_letter()) {
            return "<span class='curr-letter text-primary'>" +
                letter.toUpperCase() +
                "</span>";
        } else {
            return "<span class='curr-letter'>" +
                letter.toUpperCase() +
                "</span>";
        }
    }

    // from SO and this fiddle: http://jsfiddle.net/timdown/vXnCM/
    function setCaret() {
        let el = document.getElementById("curr-word");
        if (el.childNodes.length == 0) {
            return false;
        }
        let range = document.createRange();
        let sel = window.getSelection();
        range.setStart(el.childNodes[el.childNodes.length - 1], 1);
        range.setEnd(el.childNodes[el.childNodes.length - 1], 1);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        el.focus();
    }

    function handleKeyVal(key) {
        if (game.is_valid_partial_input(key)) {
            curr_word += key;
            $("#curr-word").append(makeSpan(key));
        } else if (key === "Enter") {
            submit();
        } else if (key === "Backspace") {
            if (curr_word !== "") {
                curr_word = curr_word.slice(0, -1);
                $("#curr-word").children().last().remove();
            }
        }

        // move cursor forward because it won't otherwise
        setCaret();
    }

    function handleKeyPress(event) {
        handleKeyVal(event.key);

        // don't type the letter, we auto-do that and color if need be
        event.preventDefault();
        return false;
    }

    for (let i = 0; i < 6; i += 1) {
        $("#other" + (i+1)).prop("value", other_letters.charAt(i));
        $("#other" + (i+1)).on("click", function(_) {
            handleKeyVal(other_letters.charAt(i));
        });
    }
    $("#center").prop("value", center_letter);
    $("#center").on("click", function(_) {
        handleKeyVal(center_letter);
    });

    $("#submit").on("click", submit);
    $("#body").keydown(handleKeyPress);
    $("#curr-word").on("focus", setCaret);
    $("#toggle-theme").on("click", toggleTheme);
}

main();
