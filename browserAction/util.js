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

  return meaning;
}

const hasWhiteSpace = (word) => /\s/g.test(word);

const validateKeyword = (keyword) => {
  keyword = (keyword || '').trim();
  // if hasWhiteSpace i.e., keyword is invalid -> send false
  return hasWhiteSpace(keyword) ? false : true;
};
