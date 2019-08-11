const bot = new function() {
    this.discount = 1.0;
    this.rewards = {good: 1.0, bad: -1000.0};
    this.learnRate = 0.7
    this.qTable = {};
    this.moveHistory = [];

    this.condenseGameState = function (gs) {
        const box = gs.getPlayer()[0].getBoundingClientRect();
        box.top = gs.position;
        let origwidth = 34.0;
        let origheight = 24.0;

        let boxwidth = origwidth - (Math.sin(Math.abs(gs.rotation) / 90) * 8);
        let boxheight = (origheight + box.height) / 2;
        let boxleft = ((box.width - boxwidth) / 2) + box.left;
        let boxtop = ((box.height - boxheight) / 2) + box.top;
        let boxright = boxleft + boxwidth;
        let boxbottom = boxtop + boxheight;

        let nextpipe = gs.pipes.filter(p => p.dataLeft + p.width() >= boxleft)[0];
        if (!nextpipe) return;

        let nextpipeupper = nextpipe.children(".pipe_upper");
        let pipetop = nextpipeupper.offset().top + nextpipeupper.height();

        let relpipeleft = nextpipeupper.offset().left - 2 - boxright;
        let relpipebottom = pipetop + pipeheight - boxbottom;

        let velocity = gs.velocity;

        // relpipeleft = nextpipe.dataLeft;
        // relpipebottom = gs.position - nextpipe.dataLeft;

        relpipeleft = parseInt(relpipeleft / 50) * 50;
        relpipebottom = parseInt(relpipebottom / 10) * 10;
        velocity = parseInt(velocity);

        return {relpipeleft,relpipebottom,velocity};
    };

    this.getAction = function (gs, action) {
        const qState = this.condenseGameState(gs);
        if (!qState) return !!action;
        const qKeyNoFlap = JSON.stringify({ ...qState, action: false });
        const qKeyFlap = JSON.stringify({ ...qState, action: true });

        if (action === undefined) {
            action = (this.qTable[qKeyNoFlap] || 0) < (this.qTable[qKeyFlap] || 0);
        }
        this.moveHistory.push({qState, action});

        return action;
    };

    this.updateQValues = function (died_high) {
        let time = 1;
        for (var i = this.moveHistory.length - 2; i >= 0; i--) {
            const state = this.moveHistory[i].qState;
            const action = this.moveHistory[i].action;
            const resState = this.moveHistory[i + 1].qState;
            let rewardType = 'good';
            if (time <= 2 || died_high) {
                rewardType = 'bad';
                died_high = died_high && time > 2;
            }
            const curReward = this.rewards[rewardType];
            // Update
            const qKey = JSON.stringify({ ...state, action });
            const qKeyResFlap = JSON.stringify({ ...resState, action: true });
            const qKeyResNoFlap = JSON.stringify({ ...resState, action: false });
            const oldValue = (1-this.learnRate) * (this.qTable[qKey] || 0);
            const newValue = this.learnRate * ( curReward + this.discount*Math.max(this.qTable[qKeyResFlap] || 0, this.qTable[qKeyResNoFlap] || 0) );

            this.qTable[qKey] = (1-this.learnRate) * (this.qTable[qKey] || 0) +
                                       this.learnRate * ( curReward + this.discount*Math.max(this.qTable[qKeyResFlap] || 0, this.qTable[qKeyResNoFlap] || 0) )
            time++;
        }

        this.moveHistory = [];
    };

    this.loadModel = function (modelId) {
        return fetch(`/models/${modelId}`)
        .then(obj => obj.json())
        .then(json => {
            const model = json;
            this.moveHistory = [];
            this.qTable = model.qTable;
        })
        .catch(() => false);
    };

    this.saveModel = function (modelId) {
        let {moveHistory, ...model} = this;
        model = JSON.parse(JSON.stringify(model));
        return $.post(`/models/${modelId}`, model, function (data, status, xhr) {
            
        });
    };
}
