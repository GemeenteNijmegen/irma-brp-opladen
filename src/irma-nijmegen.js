const defaultLang = "en"; // Default after init, and fallback when a language string is not defined.

const STATUS_CHECK_INTERVAL = 500;
const DEFAULT_TIMEOUT = 120 * 1000;

var proofJWT;

const Action = {
    Verifying: "Verifying",
    Issuing: "Issuing",
    Signing: "Signing",
};

const UserAgent = {
    Desktop: "Desktop",
    Android: "Android",
    iOS: "iOS",
};

const ErrorCodes = {
    ConnectionError: {
        Initial: "CONNERR_INITIAL",
        Status: "CONNERR_STATUS",
        Proof: "CONNERR_PROOF",
    },
    ProtocolError: {
        Initial: "PROTERR_INITIAL",
        Sessiondata: "PROTERR_SESSIONDATA",
        Status: {
            Initial: "PROTERR_STATUS_INITIAL",
            Connected: "PROTERR_STATUS_CONNECTED",
        },
    },
    InternalError: {
        State: "INTERR_STATE",
    },
    Cancelled: "CANCELLED",
    Timeout: "TIMEOUT",
    Rejected: "REJECTED"
}

const State = {
    Initialized: "Initialized",
    PopupReady: "PopupReady",
    SessionStarted: "SessionStarted",
    ClientConnected: "ClientConnected",
    Cancelled: "Cancelled",
    Timeout: "Timeout",
    Done: "Done",
};
var state = State.Done;

var popupModel = {
    "irma-title": "",
    "irma-text": "",
    "irma-loader": "",
    "irma-cancel-button": ""
};
var curLang;

const Loglevel = {
    None: 3,
    Error: 2,
    Warn: 1,
    Info: 0,
};
var loglevel; // Determines which messages are written to log

// Extra state, this flag is set when we timeout locally but the
// status socket is still active. After this flag is set, we assume
// that errors while polling (if the status socket dies) are due to
// a timeout.
var sessionTimedOut = false;

// State to manage setup
var librarySetup = false;

var ua;

var sessionPackage;
var sessionCounter = 0;

var successCallback;
var cancelCallback;
var failureCallback;


var sessionId;
var apiServer;
var action;
var actionPath;

var statusWebsocket;

var fallbackTimer;
var timeoutTimer;


function log(level, ...msg) {
    if (level < loglevel) return; // Early out if not needed

    switch(level) {
    case Loglevel.Error:
        console.error("ERROR:", ...msg);
        break;
    case Loglevel.Warn:
        console.warn("WARNING:", ...msg);
        break;
    case Loglevel.Info:
        console.info("INFO:", ...msg);
        break;
    default:
        console.log(...msg);
    }
}

function failure(errorcode, msg, ...data) {
    log(Loglevel.Error, errorcode, msg, ...data);

    state = State.Done;
    closePopup();
    cancelTimers();

    if (typeof(failureCallback) !== "undefined") {
        failureCallback(errorcode, msg, ...data);
    }
}



/* TODO: Incomplete user agent detection */
function detectUserAgent() {
    if ( /Android/i.test(navigator.userAgent) ) {
        log(Loglevel.Info, "Detected Android");
        ua = UserAgent.Android;
    } else if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        // https://stackoverflow.com/questions/9038625/detect-if-device-is-ios
        log(Loglevel.Info, "Detected iOS");
        ua = UserAgent.iOS;
    } else {
        log(Loglevel.Info, "Neither Android nor iOS, assuming desktop");
        ua = UserAgent.Desktop;
    }
}

function userCancelled(){
    cancelSession();

    var xhr = new XMLHttpRequest();
        xhr.open("DELETE", encodeURI( actionPath + sessionId ));
        xhr.onload = function () {};
        xhr.send();
}

function sendSessionToPopup() {
    log(Loglevel.Info, "sendSessionToPopup called");
    /*
    $("#irma-qrcode").empty().append(kjua({
        text: JSON.stringify(sessionPackage),
        size: 230,
        crisp: false,
    }));
    $("#irma-spinner").hide();
    $(".irma-option-container").show();
    */
}

function showMessageOnPopup(id) {
    log(Loglevel.Info, "showMessageOnPopup: " + id);
    /*
    popupChangeContent("irma-text",id);
    $(".irma-option-container").hide();
    */
}

function doSessionFromQr(qr, success_cb, cancel_cb, failure_cb) {
    log(Loglevel.Info, "doSessionFromQr");
    clearState();
    //showPopup();
    setAndCheckCallbacks(success_cb, cancel_cb, failure_cb);

    //log(Loglevel.Info, "qr: " + qr);
    //log(Loglevel.Info, "qr.u: " + qr.u );
    actionPath = qr.u.substr(0, qr.u.lastIndexOf("/")) + "/";            // Strip session token
    apiServer = actionPath.substr(0, actionPath.lastIndexOf("/")) + "/"; // Also strip session type (e.g., "issue")
    sessionId = qr.u.substr(qr.u.lastIndexOf("/") + 1, qr.u.length);
    sessionPackage = qr;
    startSession();
}

function issueFromQr(qr, success_cb, cancel_cb, failure_cb) {
    //checkInit();

    action = Action.Issuing;
    doSessionFromQr(qr, success_cb, cancel_cb, failure_cb);
}

function verifyFromQr(qr, success_cb, cancel_cb, failure_cb) {
    //checkInit();

    action = Action.Verifying;
    doSessionFromQr(qr, success_cb, cancel_cb, failure_cb);
}

function signFromQr(qr, success_cb, cancel_cb, failure_cb) {
    //checkInit();

    action = Action.Signing;
    doSessionFromQr(qr, success_cb, cancel_cb, failure_cb);
}


function clearState() {
    // Check if there is an old unfinished session going on
    if (state !== State.Cancelled && state !== State.Timeout && state !== State.Done) {
        log(Loglevel.Info, "Found previously active session, cancelling that one first");
        cancelSession(true);
    }

    state = State.Initialized;
    sessionCounter++;
    sessionPackage = {};
    sessionTimedOut = false;
}

function setAndCheckCallbacks(success_cb, cancel_cb, failure_cb) {
    successCallback = success_cb;
    cancelCallback = cancel_cb;
    failureCallback = failure_cb;

    // Ensure that all the callbacks are properly bound
    if (typeof(successCallback) !== "function") {
        log(Loglevel.Warn, "successCallback is not defined.",
                    "irma.js will not return any results!");
        successCallback = function () {};
    }

    if (typeof(cancelCallback) !== "function") {
        log(Loglevel.Warn, "cancelCallback is not defined.",
                    "irma.js will not notify cancel events!");
        cancelCallback = function () {};
    }

    if (typeof(failureCallback) !== "function") {
        log(Loglevel.Warn, "failureCallback is not defined.",
                    "irma.js will not notify error events!");
        failureCallback = function () {};
    }
}



function startSession() {
    setupClientMonitoring();
    setupFallbackMonitoring();
    setupTimeoutMonitoring();
    connectClientToken();

    sendSessionToPopup();
    state = State.SessionStarted;
}

function setupClientMonitoring() {
    var url = apiServer.replace(/^http/, "ws") + "status/" + sessionId;
    try {
        statusWebsocket = new WebSocket(url);
    } catch (Err) {
        log(Loglevel.Info, "Websocket setup failed");
    }
    statusWebsocket.onmessage = receiveStatusMessage;
}

/*
 * Periodically check if verification has completed when the
 * websocket is not active.
 */
function setupFallbackMonitoring() {
    var status_url = actionPath + sessionId + "/status";

    var checkVerificationStatus = function () {
        if ( state === State.Done || state === State.Cancelled ) {
            clearTimeout(fallbackTimer);
            return;
        }

        if ( typeof(statusWebsocket) === "undefined" ||
             statusWebsocket.readyState !== 1 ) {
            // Status WebSocket is not active, check using polling
            var xhr = new XMLHttpRequest();
            xhr.open("GET", encodeURI(status_url + "?" + Math.random()));
            xhr.onload = function () { handleFallbackStatusUpdate(xhr); };
            xhr.send();
        }
    };

    fallbackTimer = setInterval(checkVerificationStatus, STATUS_CHECK_INTERVAL);
}

/*
 * This function makes sure that just before the
 * session to the server times out, we do a manual
 * timeout if the statusSocket is not connected.
 */
function setupTimeoutMonitoring() {
    log(Loglevel.Info, "Timeout monitoring started");
    var checkTimeoutMonitor = function () {
        log(Loglevel.Info, "timeout monitoring fired");
        if ( typeof(statusWebsocket) === "undefined" ||
             statusWebsocket.readyState !== 1 ) {
            // Status WebSocket is not active, manually call timeout
            log(Loglevel.Info, "Manually timing out");
            timeoutSession();
        } else {
            // We should timeout shortly, setting state reflect this
            sessionTimedOut = true;
        }
    };

    timeoutTimer = setTimeout(checkTimeoutMonitor, DEFAULT_TIMEOUT);
}

/*
 * Handle polled status updates. There is no state , so status
 * messages will be repeatedly processed by this function.
 */
function handleFallbackStatusUpdate(xhr) {
    if (xhr.status === 200) {
        // Success
        var data = xhr.responseText;
        switch (data) {
            case "\"INITIALIZED\"":
                // No need to do anything
                break;
            case "\"CONNECTED\"":
                handleStatusMessageSessionStarted("CONNECTED");
                break;
            case "\"DONE\"":
                handleStatusMessageClientConnected("DONE");
                break;
            case "\"CANCELLED\"":
                cancelSession();
                break;
            default:
                log(Loglevel.Warn, "Got unexpected state in poll: ", data);
                break;
        }
    } else {
        // Ignore all errors when already done
        if ( state === State.Done || state === State.Cancelled ) {
            return;
        }

        // TODO: for now also assume timeout on 400 status code
        if (sessionTimedOut || xhr.status === 400) {
            // When timed-out we can ignore errors.
            log(Loglevel.Info, "Assuming polling error is due to timeout");
            timeoutSession();
            return;
        }
        failure(ErrorCodes.ConnectionError.Status, "Status poll from server failed. Returned status of " + xhr.status, xhr);
    }
}

function cancelTimers () {
    if (typeof(fallbackTimer) !== "undefined") {
        clearTimeout(fallbackTimer);
    }
    if (typeof(timeoutTimer) !== "undefined") {
        clearTimeout(timeoutTimer);
    }
}

function connectClientToken() {
    var url = "qr/json/" + encodeURIComponent(JSON.stringify(sessionPackage));
    if (ua === UserAgent.Android) {
        var intent = "intent://" + url + "#Intent;package=org.irmacard.cardemu;scheme=cardemu;"
            + "l.timestamp=" + Date.now() + ";"
            + "S.qr=" + encodeURIComponent(JSON.stringify(sessionPackage)) + ";"
            + "S.browser_fallback_url=http%3A%2F%2Fapp.irmacard.org%2Fverify;end";
        window.location.href = intent;
    } else if (ua === UserAgent.iOS) {
        window.location.href = "irma://" + url;
        /*window.open(
            "irma://" + url,
            '_blank' // <- This is what makes it open in a new tab.
        );*/
    }
}

function receiveStatusMessage(data) {
    var msg = data.data;

    if (msg === "CANCELLED") {
        cancelSession();
        return;
    }

    if (msg === "TIMEOUT") {
        log(Loglevel.Info, "Received status message TIMEOUT, timing out");
        timeoutSession();
        return;
    }

    switch (state) {
        case State.SessionStarted:
            handleStatusMessageSessionStarted(msg);
            break;
        case State.ClientConnected:
            handleStatusMessageClientConnected(msg);
            break;
        default:
            failure(ErrorCodes.InternalError.State, "ERROR: unknown current state", state);
            break;
    }
}

function handleStatusMessageSessionStarted(msg) {
    switch (msg) {
        case "CONNECTED":
            if (state === State.SessionStarted) {
                log(Loglevel.Info, "Client device has connected with the server");
                state = State.ClientConnected;
                log(Loglevel.Info, "iets doen met een popup");
                //showMessageOnPopup("Messages.FollowInstructions");
            }
            break;
        default:
            failure(ErrorCodes.ProtocolError.Status.Initial, "unknown status message in Initialized state", msg);
            break;
    }
}

function handleStatusMessageClientConnected(msg) {
    switch (msg) {
        case "DONE":
            log(Loglevel.Info, "Server returned DONE");

            state = State.Done;
            log(Loglevel.Info, "qr code verwijderen");
            closePopup();
            closeWebsocket();

            if (action === Action.Verifying)
                finishVerification();
            else if (action === Action.Issuing)
                finishIssuance();
            else if (action === Action.Signing)
                finishSigning();
            break;
        default:
            failure(ErrorCodes.ProtocolError.Status.Connected, "unknown status message in Connected state", msg);
            break;
    }
}

function finishIssuance() {
    cancelTimers();
    successCallback();
}

function finishVerification() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", encodeURI( actionPath + sessionId + "/getproof"));
    xhr.onload = function () { handleProofMessageFromServer(xhr); };
    xhr.send();
}

function finishSigning() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", encodeURI( actionPath + sessionId + "/getsignature"));
    xhr.onload = function () { handleProofMessageFromServer(xhr); };
    xhr.send();
}

function closePopup() {
    if (ua !== UserAgent.Android) {
        log(Loglevel.Info, "Closing popup. to be implemented");
        //$("#irma-server-modal").modal("hide");
    }
}

function cancelSession(cancelOld = false) {
    log(Loglevel.Info, "Token cancelled authentication", cancelOld);
    state = State.Cancelled;

    cancelTimers();
    if (!cancelOld) {
        //closePopup();
        cancelCallback(ErrorCodes.Cancelled, "User cancelled authentication");
    }
}

function closeWebsocket() {
    // Close websocket if it is still open
    if ( typeof(statusWebsocket) === "undefined" ||
         statusWebsocket.readyState === 1 ) {
        statusWebsocket.close();
    }
}

function timeoutSession() {
    log(Loglevel.Info, "Session timeout");
    state = State.Timeout;

    closeWebsocket();
    closePopup();
    cancelTimers();
    cancelCallback(ErrorCodes.Timeout, "Session timeout, please try again");
}


function handleProofMessageFromServer(xhr) {
    if (xhr.status === 200) {
        // Success
        //var data = xhr.responseText;
        proofJWT = xhr.responseText;
        log(Loglevel.Info, "Proof data: ", proofJWT);

        returnProofJWT(proofJWT);

        cancelTimers();
        successCallback("gelukt");
        
        //var token = jwt_decode(data); //decoden doen we server-side, niet client side.
        /*
        if (token.status === "VALID") {
            successCallback(data);
        } else {
            log(Loglevel.Info, "Server rejected proof: ", token.status);
            failureCallback(ErrorCodes.Rejected, "Server rejected the proof", data);
        }
        */
    } else {
        // Failure
        failure(ErrorCodes.ConnectionError.Proof, "Request for proof from server failed. Returned status of " + xhr.status, xhr);
    }
}

function base64url(src) {
    var res = btoa(src);

    // Remove padding characters
    res = res.replace(/=+$/, "");

    // Replace non-url characters
    res = res.replace(/\+/g, "-");
    res = res.replace(/\//g, "_");

    return res;
}

function createJWT(request, requesttype, subject, issuer) {
    checkInit();

    log(Loglevel.Warn, "Creating unsigned JWT!!!");
    var header = {
        alg: "none",
        typ: "JWT",
    };

    var payload = {
        sub: subject,
        iss: issuer,
        iat: Math.floor(Date.now() / 1000),
    };
    payload[requesttype] = request;

    return base64url(JSON.stringify(header)) + "." +
           base64url(JSON.stringify(payload)) + ".";
}

function createUnsignedJWT(iprequest) {
    log(Loglevel.Warn, "this function is deprecated and may be removed in later "
        + "versions. Use IRMA.createUnsignedIssuanceJWT instead.");
    return createUnsignedIssuanceJWT(iprequest);
}

function createUnsignedIssuanceJWT(iprequest) {
    return createJWT(iprequest, "iprequest", "issue_request", "testip");
}

function createUnsignedVerificationJWT(sprequest) {
    return createJWT(sprequest, "sprequest", "verification_request", "testsp");
}

function createUnsignedSignatureJWT(absrequest) {
    return createJWT(absrequest, "absrequest", "signature_request", "testsigclient");
}

function init(irmaapiserver, lang=defaultLang, iloglevel=Loglevel.Info) {
    loglevel = iloglevel;
    if (librarySetup) {
        log(Loglevel.Warn, "double call to init.");
        return;
    }

    if (irmaapiserver === undefined) {
        log(Loglevel.Warn, "Fetching api server from meta tags is deprecated, and may be removed in future versions.");
        getSetupFromMetas();
    } else {
        apiServer = irmaapiserver;
    }

    detectUserAgent();
    setLang(lang);
    librarySetup = true;
}

function checkInit() {
    if (!librarySetup) {
        log(Loglevel.Warn, "No previous call to init, fetching api and web server from meta tags");
        init();
    }
}