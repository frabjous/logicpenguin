//
import tr from './translate.js';

// Common functions

let localcheckers = {};

// determine URL
//export let url = (window.logicPenguinURL) ? window.logicPenguinURL : '';
export const url = new URL(import.meta.url).origin;

// adds element to specified parent, with additional properties
// as set by opts
export function addelem(tag, parnode, opts = {}) {
    let elem = document.createElement(tag);
    parnode.append(elem);
    for (const opt in opts) {
        if (opt == 'classes') {
            for (const cl of opts.classes) {
                elem.classList.add(cl);
            }
        } else {
            elem[opt] = opts[opt];
        }
    }
    return elem;
}

// get an element by id; just less to write
export function byid(id) {
    return document.getElementById(id);
}

export function makeInfobox() {
    let ibox = document.createElement("div");
    ibox.classList.add('infobox');
    ibox.fillme = function(message, msgicon) {
        let icontag = '<span class="material-symbols-outlined">' + msgicon + '</span>';
        this.innerHTML = '<table class="' + msgicon + '"><tbody>' +
            '<tr><td>' + icontag + '</td><td>' + tr(message) + '</td></tr>' +
            '</tbody></table>';
        if (msgicon == 'error') {
            this.scrollIntoView();
        }
    }
    return ibox;
}

export function htmlEscape(str) {
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function infoboxMsg(message, msgicon) {
    let infobox = document.getElementById('infobox');
    if (!infobox || !infobox.fillme) {
        console.error('INFOBOX Message (' + msgicon + '): ' + message);
        return;
    }
    infobox.fillme(message, msgicon);
}

// send a JSON request to server
export function jsonRequest(obj, callback) {
    // fill in data that is always needed
    if (window?.launchid)    { obj.launchid    = window.launchid; }
    if (window?.exnum)       { obj.exnum       = window.exnum; };
    if (window?.userid)      { obj.userid      = window.userid; }
    if (window?.contextid)   { obj.contextid   = window.contextid; }
    if (window?.consumerkey) { obj.consumerkey = window.consumerkey; }

    // serialize data as json
    let json = '';
    try {
        json = JSON.stringify(obj);
    } catch(err) {
        callback('Unable to serialize data to be sent to server.', false);
        return false;
    }
    if (json == '') {
        callback('No data to be sent to server.', false);
        return false;
    }

    // create request
    let xhttp = new XMLHttpRequest();
    xhttp.open("POST", url + '/json', true);
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.responseType = 'json';

    // respond when completed
    xhttp.onreadystatechange = function() {
        if (this.readyState != 4) { return; }
        let stts = parseInt();
        if ((this.status < 200) || (this.status>= 300)) {
            callback(this.statusText ?? 'Unknown error', false);
            return;
        }
        let respobj = this.response;
        if (!respobj) {
            callback('Invalid response from server', false);
        }
        if (respobj.error) {
            callback(respobj.errMsg ??
                'Unknown error reported by server', false);
            return;
        }
        callback(false, respobj);
    }

    // send request
    xhttp.send(json);
}

export async function localCheck(prob) {
    let problemtype = prob.myproblemtype;
    let rightans = prob.myanswer;
    let givenans = prob.getAnswer();
    let question = prob.myquestion;
    if (!question || !problemtype || (typeof givenans === 'undefined')
        || (typeof rightans === 'undefined')) {
        return false;
    }
    let savestatus = prob.getIndicatorStatus().savestatus;
    if (!localcheckers[problemtype]) {
        try {
            let imported = await import('./checkers/' + problemtype +
                '.js');
            localcheckers[problemtype] = imported.default;
        } catch(err) {
            this.setIndicator({
                savestatus: 'malfunction',
                successStatus: 'malfunction',
                points: -1,
                message: 'Error when loading script ' +
                    'needed to check this answer. Check your internet '
                    + 'connection and reload. If the problem persists, '
                    + 'inform your instructor. (ERR: ' + err.toString() +
                    ')'
            });
            return false;
        }
    }
    let checkStatus = await localcheckers[problemtype](question, rightans,
        givenans, false, -1, true, prob.options ?? {});
    checkStatus.points = -1;
    checkStatus.savestatus = prob.getIndicatorStatus().savestatus;
    prob.setIndicator(checkStatus);
}

// mark question in reaction to save response from server
export function processSaveAnswerResponse(err, respobj) {
    // ensure second argument is an object, for
    // referencing its properties
    if (!respobj) { respobj = {} };

    // determine which problem the response is about
    let target = false;
    if (respobj.elemid) {
        target = byid(respobj.elemid);
    }
    if (!target || !respobj.timestamp || !respobj.newind) {
        if (err) {
            infoboxMsg("Error reported by server or when processing response: " +
                err.toString() + " Check your internet connection and reload " +
                "page. If the problem persists, contact your instructor.", "error");
        } else {
            infoboxMsg("Page malfunction: unexpected response from server " +
            "when processing save request. No target specified. " +
            "Check your internet connection and reload page. If the " +
            "problem persists, contact your instructor.","error");
        }
        return;
    }

    // process error, either as a string, or as Error
    // set problem to malfunction
    if (err) {
        target.setIndicator({
            savestatus: 'malfunction',
            sucesstatus: 'malfunction',
            points: -1,
            message: 'Error saving answer: ' + err.toString() +
                '... Check your internet connection and reload the ' +
                'page. If the problem persists, contact your ' +
                'instructor.'
        });
        return;
    }

    // check if problem has been changed since response
    // if not; set its indicator
    if (target.changedat <= respobj.timestamp) {
        target.setIndicator(respobj.newind);
    }
}

// json request to save answer
export function sendAnswerToServer(saveinfo) {
    jsonRequest(saveinfo, function(err, respobj) {
        processSaveAnswerResponse(err, respobj);
    });
}
