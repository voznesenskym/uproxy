/**
 * firewall.ts
 *
 * Simple network-input validation, with possible responses.
 *
 * Types of attacks:
 *  * Javascript attacks.
 *    See https://github.com/uProxy/uproxy/issues/443 Some values fed
 *    to uProxy over the wire are directly used to index into
 *    containers.
 *
 *  * Unicode attacks.
 *    Some displayed data may be made to impersonate a user with some
 *    visual trickery.  See http://www.unicode.org/reports/tr36/#visual_spoofing
 */

/// <reference path='../freedom/typings/social.d.ts' />

module Firewall {
  var log :Logging.Log = new Logging.Log('firewall');

  export enum Severity {
    // Incorrect input.  No claims on intent.
    MalformedInput,
    // Invoked when it looks like a pretty blatant attempt to force a
    // failure/explit in uProxy.  We have some heuristics for
    // determining likely attacks, such as identifiers that are
    // specialized JS keywords like __proto__.
    LikelyAttack,
  };

  export interface ResponsePolicy {
    onValidationFailure(s :string, level :Severity ) : void;
  };

  export class DefaultResponsePolicy implements ResponsePolicy {
    public onValidationFailure(s :string, level :Severity) {
      log.warn('Message validation failure', {
        severity: level,
        text: s
      });
    }
  }

  var DEFAULT_RESPONSE_POLICY = new DefaultResponsePolicy;

  // Whether |s| is some sort of keyword in JS.  We also include the
  // properties of Object.
  export function isReservedWord(s :string) : boolean {
    var keywords = [ "__proto__", "__noSuchMethod__", "__defineGetter__",
                     "__defineSetter__", "__lookupGetter__", "__lookupSetter__"];
    for (var k in keywords) {
      if (s == keywords[k]) {
        return true;
      }
    }
    return false;
  }

  export function hasBadChars(s :string) : boolean {
    // TODO: consider unicode-based attack vectors.
    return false;
  }

  export function isPredefinedOnObject(s :string) : boolean {
    // Returns whether 's' is predefined on Object, which is just a little fishy.
    var tester = {};
    return (typeof(tester[s]) != 'undefined');
  }

  export function isUserId(s :string, response :ResponsePolicy) : boolean {
    if (isReservedWord(s) || hasBadChars(s) || isPredefinedOnObject(s)) {
      response.onValidationFailure(s, Severity.LikelyAttack);
      return false;
    }
    return true;
  }

  export function isClientId(s :string, response :ResponsePolicy) : boolean {
    if (isReservedWord(s) || hasBadChars(s) || isPredefinedOnObject(s)) {
      response.onValidationFailure(s, Severity.LikelyAttack);
      return false;
    } else {
      return true;
    }
  }

  var USER_PROFILE_SCHEMA = {
    'userId' : 'string',
    'timestamp' : '?number',
    'name' : '?string',
    'url' : '?string',
    'imageData' : '?string',
    'lastUpdated' : '?number',
    'lastSeen' : '?number'
  };

  function checkSchema(object, schema) : boolean {
    if (object === null || typeof object !== 'object') {
      return false;
    }
    var keys = Object.keys(schema);
    // We will reduce this value as we discover optional fields, and
    // as we find required fields that are present.
    var remaining_required = keys.length;

    // We will reduce this value as we discover fields that match the
    // schema.
    var object_keys_matched = Object.keys(object).length;

    for (var k in schema) {
      var type = schema[k];
      var optional = false;
      if (type[0] == '?') {
        optional = true;
        type = type.slice(1);
      }
      if (k in object) {
        remaining_required--;
        object_keys_matched--;
        if (typeof(object[k]) != type) {
          return false;
        }
      } else if (optional) {
        remaining_required--;
      } else {
        return false;
      }
    }

    return remaining_required == 0 &&
      object_keys_matched == 0;
  }

  export function isValidUserProfile(profile :freedom_Social.UserProfile,
                                     response :ResponsePolicy) : boolean {
    if (response == null) {
      response = DEFAULT_RESPONSE_POLICY;
    }

    // Call this when we're not handing the |response| object to
    // methods (where they'd call onValidationFailure themselves)
    function fail() {
      response.onValidationFailure(JSON.stringify(profile),
                                   Severity.MalformedInput);
    }

    // UserProfile can only have 5 properties.
    if (!checkSchema(profile, USER_PROFILE_SCHEMA)) {
      fail();
      return false;
    }

    // Validate fields.
    if (!isUserId(profile.userId, response)) {
      return false;
    }

    // TODO: Consider clamping timestamp to 'now' at the high end.
    if (profile.timestamp < 0) {
      fail();
      return false;
    }

    return true;
  }

  var CLIENT_STATE_SCHEMA = {
    'userId' : 'string',
    'clientId' : 'string',
    'status' : 'string',
    'timestamp' : '?number',
    'lastUpdated' : '?number',
    'lastSeen' : '?number'
  };

  export function isValidClientState(state :freedom_Social.ClientState,
                                     response :ResponsePolicy) : boolean {
    if (response == null) {
      response = DEFAULT_RESPONSE_POLICY;
    }

    // Call this when we're not handing the |response| object to
    // methods (where they'd call onValidationFailure themselves)
    function fail() {
      response.onValidationFailure(JSON.stringify(state),
                                   Severity.MalformedInput);
    }

    if (!checkSchema(state, CLIENT_STATE_SCHEMA)) {
      fail();
      return false;
    }

    if (!isUserId(state.userId, response)) {
      return false;
    }

    if (!isClientId(state.clientId, response)) {
      return false;
    }

    if (hasBadChars(state.status)) {
      fail();
      return false;
    }

    if (state.timestamp < 0) {
      fail();
      return false;
    }

    return true;
  }

  var INCOMING_MESSAGE_SCHEMA = {
    'from' : 'object',
    'message' : 'string'
  };

  export function isValidIncomingMessage(state :freedom_Social.IncomingMessage,
                                         response :ResponsePolicy) :boolean {
    if (response == null) {
      response = DEFAULT_RESPONSE_POLICY;
    }

    // Call this when we're not handing the |response| object to
    // methods (where they'd call onValidationFailure themselves)
    function fail() {
      response.onValidationFailure(JSON.stringify(state),
                                   Severity.MalformedInput);
    }

    if (!checkSchema(state, INCOMING_MESSAGE_SCHEMA)) {
      fail();
      return false;
    }

    if (!isValidClientState(state.from, response)) {
      return false;
    }

    return true;
  }
}  // module Firewall
