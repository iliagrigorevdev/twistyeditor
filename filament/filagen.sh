#!/bin/bash

filamesh --compress prism.obj ../public/res/prism.filamesh
filamesh --compress knob.obj ../public/res/knob.filamesh
filamesh --compress section.obj ../public/res/section.filamesh

matc -a opengl -p mobile -V skinning,vsm,ssr,stereo -o ../public/res/prism.filamat prism.mat
matc -a opengl -p mobile -V skinning,vsm,ssr,stereo -o ../public/res/ghost.filamat ghost.mat
matc -a opengl -p mobile -V skinning,vsm,ssr,stereo -o ../public/res/ground.filamat ground.mat
matc -a opengl -p mobile -V skinning,vsm,ssr,stereo -o ../public/res/highcol.filamat highcol.mat
