function formatMeaning(meaning) {
  meaning = meaning.replace(/{bc}/g, ''); // bold colon and a space
  meaning = meaning.replace(/{ldquo}|{rdquo}/g, '"'); // double quotes
  meaning = meaning.replace(/{b}/g, '<b>'); // bold open
  meaning = meaning.replace(/{\/b}/g, '</b>'); // bold close
  meaning = meaning.replace(/{it}/g, '<i>'); // italics open
  meaning = meaning.replace(/{\/it}/g, '</i>'); // italics close
  meaning = meaning.replace(/{inf}/g, '<sub>'); // subscript open
  meaning = meaning.replace(/{\/inf}/g, '</sub>'); // subscript close
  meaning = meaning.replace(/{sup}/g, '<sup>'); // superscript open
  meaning = meaning.replace(/{\/sup}/g, '</sup>'); // superscript close
  meaning = meaning.replace(/({a_link\|)(\w+)}/g, '$2'); //substitute with second capture group
  meaning = meaning.replace(
    /{sx\|([\w\s]*)([:\d]*)\|([\w\s]*)([:\d]*)\|([\w]*)}/g,
    sxReplacer,
  ); //synonymous cross-reference
  // dx_def, dxt, dlink
  meaning = meaning.replace(/({dx_def})(.*)({\/dx_def})/g, '[$2]');
  meaning = meaning.replace(
    /({dxt)\|([\w\s]*)([:\d]*)\|(.*)\|([illustraion|table|\d?])}/g,
    '<i><a href=#>$2</a><i>',
  );
  meaning = meaning.replace(
    /({d_link)\|([\w\s]*)([:\d]*)\|([\w\s]*)([:\d]*)}/g,
    '<a href=#>$2</a>',
  );

  // return uppercase of the second capture group [not an anchor tag]
  function sxReplacer(match, p1, p2, p3, p4, p5) {
    return `<a href=#>:${p1.toUpperCase()}</a>`;
  }

  return meaning;
}

const hasWhiteSpace = (word) => /\s/g.test(word);

const validateKeyword = (keyword) => {
  return hasWhiteSpace(keyword) ? false : true;
};

function getSubDirectory(audioFile) {
  const bix = /^bix/;
  const gg = /^gg/;
  const number = /^[0-9\W]/;
  if (bix.test(audioFile)) return 'bix';
  else if (gg.test(audioFile)) return 'gg';
  else if (number.test(audioFile)) return 'number';
  else return audioFile.charAt(0);
}

async function checkCache(keyword) {
  // fetching recentWords from LocalStorage
  let store = {};
  store = await LocalStorage.get('recentWords');
  if (Object.keys(store).length == 0) {
    store = { recentWords: [] };
    LocalStorage.set(store);
  }
  // checking if 'keyword' exist in recentWords
  let foundWord = null;
  store['recentWords'].some((word) => {
    if (word.originalSearch === keyword.toLowerCase()) {
      foundWord = word;
      // breaking after finding the keyword
      return true;
    }
  });
  return foundWord;
}

async function setCache(keyword, response, hasHomograph) {
  const newRecentWord = {
    originalSearch: keyword.toLowerCase(),
    actualSearch: response[0].meta.id,
    definition: response,
    hasHomograph: hasHomograph,
  };
  // fetch recentWords from LocalStorage
  let store = await LocalStorage.get('recentWords');
  // check the limit of cached words [limit = 20]
  if (store['recentWords'].length >= 20) store['recentWords'].pop();
  // add new word and its definition to cache
  store['recentWords'].unshift(newRecentWord);
  LocalStorage.set(store);
}

function setAudio(response) {
  let keyContainer = document.getElementById('key-container');
  let soundButton = document.createElement('button');
  soundButton.classList.add('icon-button');
  let audio = document.getElementById('pronunciation');
  let audioUrl = 'https://media.merriam-webster.com/soundc11';
  let audioFile = response[0].hwi.prs[0].sound.audio;
  if (!audioFile) {
    return;
  }
  let subDir = getSubDirectory(audioFile);
  audioUrl = `${audioUrl}/${subDir}/${audioFile}.wav`;
  audio.src = audioUrl;
  keyContainer.appendChild(soundButton);
  soundButton.onclick = () => {
    audio.play();
  };
}

function setDefinition(response, hasHomograph) {
  // received response is an array of objects now
  let keyword = document.getElementById('keyword');
  let pos = document.getElementById('pos');
  let resultText = document.getElementById('text-result');
  resultText.classList.remove('spacer');

  let actualWord = response[0].meta.id;
  let partOfSpeech = response[0].fl;
  setAudio(response);

  // removing the ending colon and digit :1, :2, :3
  keyword.innerHTML = actualWord.replace(/:\d/g, '');
  pos.innerHTML = partOfSpeech;
  resultText.innerHTML = '';
  // if not homograph, then go through the first element only
  // else go through all elements one by one
  if (!hasHomograph) {
    element = response[0];
    element.def.forEach((def) => {
      if (def.hasOwnProperty('vd')) {
        let vd = document.createElement('div');
        vd.classList.add('verb-divider');
        vd.innerHTML = `<i>: ${def.vd}</i>`;
        resultText.appendChild(vd);
      }
      let ol = document.createElement('ol');
      def.sseq.forEach((sseq) => {
        sseq.forEach((item) => {
          if (item[1].hasOwnProperty('dt')) {
            let li = document.createElement('li');
            let formattedMeaning = formatMeaning(item[1].dt[0][1]);
            li.innerHTML = formattedMeaning;
            ol.appendChild(li);
          }
        });
      });
      resultText.appendChild(ol);
    });
  } else {
    // using 'every' to break after first non 'hom' element is found
    response.every((element, index) => {
      if (element.hasOwnProperty('hom')) {
        let entry = document.createElement('div');
        let newPOS = element.fl;
        entry.classList.add('entry-number');
        entry.innerHTML = `<i>entry ${index + 1}</i> [${newPOS}]`;
        resultText.appendChild(entry);
        element.def.forEach((def) => {
          if (def.hasOwnProperty('vd')) {
            let vd = document.createElement('div');
            vd.classList.add('verb-divider');
            vd.innerHTML = `<i>: ${def.vd}</i>`;
            resultText.appendChild(vd);
          }
          let ol = document.createElement('ol');
          def.sseq.forEach((sseq) => {
            sseq.forEach((item) => {
              if (item[1].hasOwnProperty('dt')) {
                let li = document.createElement('li');
                let formattedMeaning = formatMeaning(item[1].dt[0][1]);
                li.innerHTML = formattedMeaning;
                ol.appendChild(li);
              }
            });
          });
          resultText.appendChild(ol);
        });
        return true;
      } else {
        return false;
      }
    });
  }
}
