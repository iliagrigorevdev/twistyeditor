#!/bin/bash

filamesh --compress prism.obj ../public/res/prism.filamesh
filamesh --compress knob.obj ../public/res/knob.filamesh

matc -a opengl -p mobile -o ../public/res/prism.filamat prism.mat
matc -a opengl -p mobile -o ../public/res/ghost.filamat ghost.mat
matc -a opengl -p mobile -o ../public/res/knob.filamat knob.mat
