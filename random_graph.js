function add(a,b) {return a+b;}
function subtract(a,b) {return a-b;}
function norm2(a) {return sqrt(a.x*a.x + a.y*a.y);}

class Vector2D {
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
    norm2(){
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }
    add(other){
        return new Vector2D(this.x+other.x, this.y+other.y);
    }
    mul(a){
        return new Vector2D(a * this.x, a * this.y);
    }
    update(fn, other){
        this.x = fn(this.x, other.x);
        this.y = fn(this.y, other.y);
    }
}

function distvec(v1, v2){
    return new Vector2D(v2.x-v1.x, v2.y-v1.y);
}

function real2canvas(x, y, shift, scale){
    return [scale.x *(x+shift.x), scale.y *(y+shift.y)];
}

function canvas2real(x, y, shift, scale){
    return [x/scale.x-shift.x, y/scale.y-shift.y];
}

class Vertex {
    constructor(x, y, r, c, meta){
        this.x = x;
        this.y = y;
        this.r = r;
        this.c = c;
        this.meta = meta;
    }
    show(shift=new Vector2D(0.0, 0.0), scale=new Vector2D(1.0, 1.0)) {
        fill(this.c);
        let [x, y] = real2canvas(this.x, this.y, shift, scale);
        ellipse(x, y, 2*this.r);
    }
    move(dx, dy){
        this.x = this.x + dx;
        this.y = this.y + dy;
    }
    contains(x, y, shift, scale){
        //return (norm2({x:this.x - x, y:this.y-y}) < this.r);
        let [xnorm, ynorm] = real2canvas(this.x - x, this.y - y, {x:0,y:0}, scale);
        return (sqrt(xnorm*xnorm + ynorm*ynorm) < this.r);
    }
}

class Edge {
    constructor(one, two){
        this.one = one;
        this.two = two;
    }
}

function showedge(v1, v2, shift=new Vector2D(0.0, 0.0), scale=new Vector2D(1.0, 1.0)) {
    let [x1, y1] = real2canvas(v1.x, v1.y, shift, scale);
    let [x2, y2] = real2canvas(v2.x, v2.y, shift, scale);
    line(x1, y1, x2, y2);
}


class Graph {
    constructor(vertices, edges){
        this.vertices = vertices;
        this.edges    = edges;
        this.shift    = new Vector2D(0.0, 0.0);
        this.scale    = new Vector2D(1.0, 1.0);
    }
    contain(width, height){
        let xmin = 0;
        let xmax = width;
        let ymin = 0;
        let ymax = height;
        for (let v of this.vertices){
            if (v.x < xmin){
                xmin = v.x;
            }
            else if (v.x > xmax) {
                xmax = v.x;
            }
            if (v.y < ymin){
                ymin = v.y;
            }
            else if (v.y > ymax) {
                ymax = v.y;
            }
        }
        this.shift.x = 0 - xmin;
        this.shift.y = 0 - ymin;
        this.scale.x = width/(xmax - xmin);
        this.scale.y = height/(ymax - ymin);
    }
    show(){
        for (let e of this.edges){
            let v1 = this.vertices[e.one];
            let v2 = this.vertices[e.two];
            showedge(this.vertices[e.one], this.vertices[e.two],
                     this.shift, this.scale);
        }
        for (let v of this.vertices){
            v.show(this.shift, this.scale);
        }
    }
    gradient(springK, coloumbK, kappa=0.1){
        let unitlength = 1 / this.scale.norm2();
        let grad = [];
        for(let i = 0; i < this.vertices.length; i++){
            grad.push(new Vector2D(0.0, 0.0));
        }
        for (let e of this.edges){
            let v = distvec(this.vertices[e.one], this.vertices[e.two]);
            if (true){
                grad[e.one].update(subtract, v.mul(springK));
                grad[e.two].update(add, v.mul(springK));
            }
        }
        for (let i = 0; i< this.vertices.length; i++){
            for (let j = i+1; j< this.vertices.length; j++){
                let v = distvec(this.vertices[i], this.vertices[j]);
                let d = v.norm2()/unitlength;
                let d3 = Math.pow(d, 3);
                if (true) {
                    grad[i].update(add, v.mul(Math.exp(-kappa*d)*coloumbK/d3));
                    grad[j].update(subtract, v.mul(Math.exp(-kappa*d)*coloumbK/d3));
                }
            }
        }
        return grad;
    }
    evolve(rate=1.0){
        let grad = this.gradient(0.5, 5000, 0.001);
        for (let i = 0; i < this.vertices.length; i++){
            this.vertices[i].move(-rate*grad[i].x, -rate*grad[i].y);
        }
    }
}

let r, g, b;
let N = 70;
let p = 0.02;
let canvasX = 720;
let canvasY = 400;
var vclr = {r:255, g:255, b:255};
var sclr = {r:129, g:180, b:180};
edgeItr = new Edge(0, 0);
graph = new Graph([], [], []);
var state = {
    edgeInit  : false,
    edgesDone : false
};
var offset = new Vector2D(0.0, 0.0);
var islocked = false;
var lockedidx = -1;

function setup() {
    createCanvas(canvasX, canvasY);
    vclr = {
        r : random(255),
        g : random(255),
        b : random(255)
    };
    vclr = {
        r : 76,
        g : 126,
        b : 126
    };
    initializeGraph(N);
}

function draw() {
    background(0);
    stroke(vclr.r, vclr.g, vclr.b);

    graph.contain(canvasX, canvasY);
    graph.show();
    if (document.getElementById("evolveSlider").checked) {
        graph.evolve(0.1);
    }
    if (state.edgeInit && (!state.edgeDone)){
        let edgeadded = false;
        while (!edgeadded){
            if (random() < p + graph.vertices[edgeItr.two].meta.neighbors/N){
                addEdge(edgeItr.one, edgeItr.two);
                edgeadded=true;
            }
            next(edgeItr);
        }
    }
}

function next(e){
    if (e.two == N-1){
        if (e.one == N-2) {
            state.edgeDone = true;
            e.one = 0;
            e.two = 0;
        }
        else {
            e.one += 1;
            e.two = e.one+1;
        }
    }
    else {
        e.two += 1;
    }
}

function initializeGraph(n_vertices) {
    var radius = 5;
    c = color(vclr.r, vclr.g, vclr.b);
    for (let i = 0; i < n_vertices; i++) {
        let x = random(radius, canvasX-radius);
        let y = random(radius, canvasY-radius);
        graph.vertices.push(new Vertex(x, y, radius, c, {neighbors:0}));
    }
}

function addEdge(i, j){
    graph.vertices[i].meta.neighbor += 1;
    graph.vertices[j].meta.neighbor += 1;
    graph.vertices[i].r += 1;
    graph.vertices[j].r += 1;
    graph.edges.push(new Edge(i, j));
}

function startClicked(clicked_id)
{
    state.edgeInit = true;
}

function mousePressed() {
    let [rlmouseX, rlmouseY] = canvas2real(mouseX, mouseY, graph.shift, graph.scale);
    for (let i = 0; i < graph.vertices.length; i++){
        v = graph.vertices[i];
        if (v.contains(rlmouseX, rlmouseY, graph.shift, graph.scale)){
            if (islocked) {
                offset.x = rlmouseX - v.x;
                offset.y = rlmouseY - v.y;
                lockedidx = i;
            }
            else {
                offset.x = rlmouseX - v.x;
                offset.y = rlmouseY - v.y;
                islocked  = true;
                lockedidx = i;
            }
        }
    }
    if (islocked) {
        v = graph.vertices[lockedidx];
        v.c = color(sclr.r, sclr.g, sclr.b);
    }
}

function mouseDragged() {
    if (islocked) {
        v = graph.vertices[lockedidx];
        let [rlmouseX, rlmouseY] = canvas2real(mouseX, mouseY, graph.shift, graph.scale);
        v.x = rlmouseX - offset.x;
        v.y = rlmouseY - offset.y;
    }
}

function mouseReleased() {
    if (islocked){
        graph.vertices[lockedidx].c = color(vclr.r, vclr.g, vclr.b);
        islocked = false;
        lockedidx = -1;
    }
}
