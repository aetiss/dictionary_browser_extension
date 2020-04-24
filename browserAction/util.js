function formatMeaning(meaning) {
  meaning = meaning.replace(/{bc}/g, ':'); // bold colon and a space
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

  // FIXED: need to capitalize then word and add anchor tag to it
  meaning = meaning.replace(/({sx\|)([\w+\s+]*)(\|\|[\d]*})/g, sxReplacer); //synonymous cross-reference

  // return uppercase of the second capture group [not an anchor tag]
  function sxReplacer(match, p1, p2, p3) {
    return p2.toUpperCase();
  };

  return meaning;
}

const hasWhiteSpace = (word) => /\s/g.test(word);

const validateKeyword = (keyword) => {
  return hasWhiteSpace(keyword) ? false : true;
};

function setDefinition(response, hasHomograph) {
  // received response is an array of objects now
  let keyword = document.getElementById('keyword');
  let pos = document.getElementById('pos');
  let resultText = document.getElementById('text-result');

  // base heading [keyword and pos at the top of the pop-up]
  let actualWord = response[0].meta.id;
  let partOfSpeech = response[0].fl;

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
        vd.classList.add('no-space');
        vd.innerHTML = `<i>${def.vd}</i>`;
        resultText.appendChild(vd);
      }
      let ol = document.createElement('ol');
      def.sseq.forEach((sseq, sseqIndex) => {
        console.log(`sseq no. ${sseqIndex + 1}`);
        sseq.forEach((item, itemIndex) => {
          if (item[1].hasOwnProperty('dt')) {
            let li = document.createElement('li');
            console.log(`\titem no. ${itemIndex + 1}`, item[1].dt[0][1]);
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
        console.log(`homograph number ${index + 1}`);
        let entry = document.createElement('p');
        let newPOS = element.fl;
        entry.innerHTML = `<i>entry ${index + 1}</i> :${newPOS}`;
        resultText.appendChild(entry);
        element.def.forEach((def) => {
          if (def.hasOwnProperty('vd')) {
            let vd = document.createElement('div');
            vd.classList.add('no-space');
            vd.innerHTML = `<i>-\t${def.vd}</i>`;
            resultText.appendChild(vd);
          }
          let ol = document.createElement('ol');
          def.sseq.forEach((sseq, sseqIndex) => {
            console.log(`sseq no. ${sseqIndex + 1}`);
            sseq.forEach((item, itemIndex) => {
              if (item[1].hasOwnProperty('dt')) {
                let li = document.createElement('li');
                console.log(`\titem no. ${itemIndex + 1}`, item[1].dt[0][1]);
                let formattedMeaning = formatMeaning(item[1].dt[0][1]);
                li.innerHTML = formattedMeaning;
                ol.appendChild(li);
              }
            });
          });
          resultText.appendChild(ol);
        });
        return true;
      }
      else {
        return false;
      }
    });
  }
}
