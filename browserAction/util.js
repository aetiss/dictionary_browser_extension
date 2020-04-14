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
  meaning = meaning.replace(/({a_link\|)(\w+)}/g, '$2'); //substitute with second grouping

  //FIXME: need to capitalize then word and add anchor tag to it
  meaning = meaning.replace(/{sx|}/g, ''); //synonymous cross-reference

  return meaning;
}

const hasWhiteSpace = (word) => /\s/g.test(word);

const validateKeyword = (keyword) => {
  return hasWhiteSpace(keyword) ? false : true;
};

function setDefinition(response) {
  let keyword = document.getElementById('keyword');
  let resultText = document.getElementById('text-result');
  let pos = document.getElementById('pos');
  results = response.data[0].def[0].sseq;
  actualSearch = response.data[0].meta.id;
  console.log(`able to parse JSON - ${actualSearch}`);
  partOfSpeech = response.data[0].fl; // functinal label
  keyword.innerHTML = actualSearch;
  resultText.innerHTML = '';
  pos.innerHTML = partOfSpeech;

  let ol = document.createElement('ol');
  results.forEach((item) => {
    item.forEach((definition) => {
      definition.forEach((meaning) => {
        if (meaning.dt) {
          let li = document.createElement('li');
          ol.appendChild(li);
          let formattedMeaning = formatMeaning(meaning.dt[0][1]);
          li.innerHTML += formattedMeaning;
        }
      });
    });
  });
  resultText.appendChild(ol);
}
