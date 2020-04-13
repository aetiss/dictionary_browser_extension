function formatMeaning(meaning) {
  meaning = meaning.replace(/{bc}/g, '');           // bold colon and a space
  meaning = meaning.replace(/{ldquo}/g, '"');       // double quotes open
  meaning = meaning.replace(/{rdquo}/g, '"');       // double quotes close
  meaning = meaning.replace(/{b}/g, '<b>');         // bold open
  meaning = meaning.replace(/{\/b}/g, '</b>');      // bold close
  meaning = meaning.replace(/{it}/g, '<i>');        // italics open
  meaning = meaning.replace(/{\/it}/g, '</i>');     // italics close
  meaning = meaning.replace(/{inf}/g, '<sub>');     // subscript open
  meaning = meaning.replace(/{\/inf}/g, '</sub>');  // subscript close
  meaning = meaning.replace(/{sup}/g, '<sup>');     // superscript open
  meaning = meaning.replace(/{\/sup}/g, '</sup>');  // superscript close
  meaning = meaning.replace(/{a_link\|\w+}/g, replace_alink);

  function replace_alink(match) {
    console.log(match);
    return match.slice(8, -1);
  }

  return meaning;
}