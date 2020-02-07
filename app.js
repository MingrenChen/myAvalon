const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let players = {};
let reconnect = {}
let captain = -1;
let candidates = []
let voting = [{'true': [], 'false': []}]

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');

});

app.get("/users", function (req, res) {
    res.send({"a": "b"})
});

io.on('connection', function (socket) {
    socket.on('player_connect', function (data) {
        if (data.username === 'removeall'){
            reconnect = {}
            candidates = []
            voting = [{true: [], false: []}]
        } else {
            players[socket.id] = {username: data.username};
            if (Object.keys(reconnect).includes(data.username)){
                players[socket.id].index = reconnect[data.username].index
                players[socket.id].character = reconnect[data.username].character
                delete reconnect[data.username]
            }
            else if (Object.keys(players).length === 2){
                captain = Math.floor(Math.random() * Math.floor(2)) + 1
                startPlay()
            }
            io.sockets.emit("update_players", {players: players, captain: captain, candidates: candidates, voting: voting})
        }
    });

    socket.on('car', data => {
        candidates = data.candidates;
        captain = (captain % 2) + 1
        io.sockets.emit("update_players", {players: players, captain: captain, candidates: candidates, voting: voting})
        io.sockets.emit('startVoting')
    })

    socket.on('voteforcar', car => {
        let round = voting.length - 1;
        if (voting[round]['true'].length + voting[round]['false'].length === 2) {
            voting.push({true: [], false: []})
            round += 1
        }
        voting[round][car.toString()].push(players[socket.id].username);
        io.sockets.emit("update_players", {
            players: players,
            captain: captain,
            candidates: candidates,
            voting: voting,
        })
        if (voting[round]['true'].length + voting[round]['false'].length === 2){
            io.sockets.emit('votingEnd')
            candidates = []
        }

    })

    socket.on('disconnect', function(){
        let player = players[socket.id]
        if (player && player.character) {
            reconnect[players[socket.id].username] = {
                index: player.index,
                character: player.character
            }
        }
        delete players[socket.id];
        io.sockets.emit("update_players", {players: players, captain: captain});
        console.log(socket.id + ' disconnected');
    });
});

let startPlay = function(){
    function shuffle(array) {
        array.sort(() => Math.random() - 0.5);
    }
    let avalon = ['梅林', "派西维尔"
        , "莫甘娜", "莫德雷德", "奥伯伦", "刺客",
        "梅林的忠臣-大胸-女", "梅林的忠臣", "梅林的忠臣", "梅林的忠臣"]
    shuffle(avalon)
    let i = 0
    Object.values(players).forEach(player=> {
        player.character = avalon[i];
        player.index = i + 1
        i += 1;
    })
}

http.listen(3000, function(){
    console.log('listening on *:3000');
});