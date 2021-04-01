#!/bin/bash

mkdir code 2>/dev/null

code="{\n"
html=""
cd webp && for f in *.webp
do
  title=$(echo $f | sed 's/\.[^.]*$//')  
  key=$(echo $title | sed 's/.*/\L&/' | sed 's/ //' | sed 's/[^[:alnum:]]//g')
  image=$(cat "$title.webp" | base64 -w 0)

code+="  $key: {
    title: \"$title\",
    image: \"data:image/webp;base64,$image\",
  },
"
html+="$title
<img
  src=\"data:image/webp;base64,$image\"
/>

"
done

code+="};"

printf "$code" > ../code/code.js
printf "$html" > ../code/code.html
printf "$code" | xclip -sel clip
echo "Copied code to clipboard"

