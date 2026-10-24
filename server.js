const express=require("express"),http=require("http"),session=require("express-session"),MongoStore=require("connect-mongo"),helmet=require("helmet"),rateLimit=require("express-rate-limit"),crypto=require("crypto"),path=require("path");
const app=express(),server=http.createServer(app),io=require("socket.io")(server),PORT=process.env.PORT||3000,prod=process.env.NODE_ENV==="production";
const PASS=process.env.SITE_PASSWORD,SECRET=process.env.SESSION_SECRET;
if(!PASS||PASS.length<12||!SECRET||SECRET.length<32){console.error("Set SITE_PASSWORD (12+ chars) and SESSION_SECRET (32+ chars).");process.exit(1);}
app.set("trust proxy",1);app.set("view engine","ejs");app.set("views",path.join(__dirname,"views"));
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],connectSrc:["'self'","ws:","wss:"],mediaSrc:["'self'","blob:"],imgSrc:["'self'","data:"],objectSrc:["'none'"],frameAncestors:["'none'"]}}}));
app.use(express.urlencoded({extended:false,limit:"10kb"}));
const opts={name:"privatecall.sid",secret:SECRET,resave:false,saveUninitialized:false,cookie:{httpOnly:true,secure:prod,sameSite:"strict",maxAge:8*60*60*1000}};
if(process.env.MONGODB_URI)opts.store=MongoStore.create({mongoUrl:process.env.MONGODB_URI});
const sessionMiddleware=session(opts);app.use(sessionMiddleware);io.engine.use(sessionMiddleware);
app.use("/assets",express.static(path.join(__dirname,"public")));
const limiter=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:"draft-7",legacyHeaders:false});
function logged(req,res,next){if(req.session?.ok)return next();res.redirect("/");}
app.get("/",(req,res)=>req.session?.ok?res.redirect("/call"):res.render("login",{error:""}));
app.post("/login",limiter,(req,res,next)=>{const a=Buffer.from(String(req.body.password||"")),b=Buffer.from(PASS);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(401).render("login",{error:"Incorrect password. Try again."});req.session.regenerate(err=>{if(err)return next(err);req.session.ok=true;req.session.save(err=>err?next(err):res.redirect("/call"));});});
app.post("/logout",logged,(req,res,next)=>req.session.destroy(err=>{if(err)return next(err);res.clearCookie("privatecall.sid",{httpOnly:true,sameSite:"strict",secure:prod});res.redirect("/");}));
app.get("/call",logged,(req,res)=>res.render("call"));
io.use((s,next)=>s.request.session?.ok?next():next(new Error("Unlock site first")));
const rooms=new Map();
function leave(s){const c=s.data.room;if(!c)return;s.leave(c);const set=rooms.get(c);if(set){set.delete(s.id);s.to(c).emit("peer-left");if(!set.size)rooms.delete(c);}s.data.room=null;}
function relay(s,event,payload){const c=s.data.room;if(c&&rooms.get(c)?.has(s.id))s.to(c).emit(event,payload);}
io.on("connection",s=>{s.on("join-room",raw=>{const c=String(raw||"").trim().toUpperCase();if(!/^[A-Z0-9]{4,12}$/.test(c))return s.emit("call-error","Room code must be 4–12 letters/numbers.");leave(s);let set=rooms.get(c);if(!set)rooms.set(c,set=new Set());if(set.size>=2)return s.emit("call-error","Room is full.");set.add(s.id);s.data.room=c;s.join(c);s.emit("room-joined",{peerPresent:set.size===2});if(set.size===2)s.to(c).emit("peer-joined");});["webrtc-offer","webrtc-answer","webrtc-ice-candidate"].forEach(e=>s.on(e,p=>relay(s,e,p)));s.on("leave-room",()=>leave(s));s.on("disconnect",()=>leave(s));});
server.listen(PORT,()=>console.log("Private Call listening on "+PORT));
