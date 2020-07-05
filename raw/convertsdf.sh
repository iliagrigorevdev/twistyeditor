#!/bin/bash

DEST_ANDROID=../src/main/res/raw/
POW_EXPONENT=$(bc -l <<< "1.0/2.2")
CONVERT_PARAMS="-evaluate pow $POW_EXPONENT -colorspace Gray -depth 8"

for i in {0..7}
do
	magick prism$i.png $CONVERT_PARAMS $DEST_ANDROID/prism$i.png
done
