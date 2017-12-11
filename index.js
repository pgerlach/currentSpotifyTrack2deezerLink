#!/usr/bin/env node

const applescript = require('applescript');
const promisify = require('es6-promisify');
const rp = require('request-promise-native');
const clipboardy = require('clipboardy');

const appleScriptExecString = promisify(applescript.execString, applescript);

// https://developer.spotify.com/applescript-api/
const applescriptToGetSpotifyCurrentPlayingTrackInfos = `
  tell application "Spotify"
    set currentArtist to artist of current track as string
    set currentTrack to name of current track as string
    set currentAlbum to album of current track as string
    return {artist: currentArtist, track: currentTrack, album: currentAlbum}
  end tell
`;

async function getCurrentTrackInfoFromSpotify() {
  const scriptResult = await appleScriptExecString(applescriptToGetSpotifyCurrentPlayingTrackInfos);
  console.log("What Spotify tells:");
  console.log(scriptResult);
  // result is an array like [ 'artist:"Twinkle Twinkle Little Rock Star"', 'track:"Basket Case"', 'album:"Lullaby Versions of Green Day"' ]
  // convert to useful object
  const res = {};
  const regexp = /([a-z]+):"(.+)"$/;

  for (elt of scriptResult) {
    if (regexp.test(elt)) {
      [_, key, value] = elt.match(regexp);
      res[key] = value;
    } else {
      console.log("weird: no match to regexp", elt);
    }
  }
  return res;
}

// https://developers.deezer.com/api/search
async function getDeezerTrackUrl(trackInfo) {
  console.log("getDeezerTrackUrl", trackInfo);
  const queryString = `track:"${trackInfo.track}" artist:"${trackInfo.artist}" album:"${trackInfo.album}"`;
  const uri = `https://api.deezer.com/search?q=${encodeURIComponent(queryString)}`;
  console.log("uri:", uri);
  const deezerResponse = await rp({
    uri,
    json: true
  });
  if (deezerResponse && deezerResponse.data) {
    for (track of deezerResponse.data) {
      console.log(`${track.link} ("${track.title}", by "${track.artist.name}", on album "${track.album.title}")`);
    }
    if (deezerResponse.data.length === 1) {
      clipboardy.writeSync(deezerResponse.data[0].link);
      console.log("(link has been copied to clipboard)");
    }
  }
}

async function go() {
  const currentTrackInfos = await getCurrentTrackInfoFromSpotify();
  await getDeezerTrackUrl(currentTrackInfos);
}

go()
.catch(err => {console.log("ERROR:", err)});
