#!/bin/bash
SESSION=Blixt

# if the session is already running, just attach to it.
tmux has-session -t $SESSION
if [ $? -eq 0 ]; then
  echo "Session $SESSION already exists. Attaching."
  sleep 1
  tmux -2 attach -t $SESSION
  exit 0;
fi

# create a new session, named $SESSION, and detach from it
tmux -2 new-session -d -s $SESSION

# Now populate the session with the windows you use every day
tmux set-option -g base-index 1
tmux set-window-option -t $SESSION -g automatic-rename off
tmux set-window-option -g pane-base-index 1

tmux new-window -t $SESSION:1 -k -n Blixt-dev
tmux split-window -h -p 50
tmux select-pane -t 2
tmux split-window -v -p 50
tmux send-keys -t ${window}.2 'npm start' Enter
tmux send-keys -t ${window}.1 'atom .' Enter
tmux send-keys -t ${window}.1 'react-native run-android --no-packager' Enter
tmux send-keys -t ${window}.3 'react-native log-android' Enter
tmux new-window -t $SESSION:2 -k -n Emulator
#tmux send-keys -t ${window}.1 'emulator @Nexus_5X' Enter
tmux send-keys -t ${window}.1 'emulator @Pixel_2_XL' Enter
tmux set-window-option -t $SESSION:0 automatic-rename off

# all done. select starting window and get to work
tmux select-window -t $SESSION:1
tmux kill-window -t $SESSION:0
tmux -2 attach -t $SESSION
