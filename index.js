const express = require('express');
const app = express();
var jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
//middlewere
app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@rokon.tnm65c6.mongodb.net/?retryWrites=true&w=majority&appName=Rokon`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});




async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection



    const bistroDbCollection = client.db('BistroDb').collection('menus');
    const BistroReview = client.db('BistroDb').collection('BistroReview');
    const cartCollection = client.db('BistroDb').collection('cartCollection');
    const userCollection = client.db('BistroDb').collection('users');
    
    //jwt related api

    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '24h'})
      res.send({token});
    })

    
    //midaleWare token verify
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization)
      if(!req.headers.authorization){
        return res.status(401).send({message: 'forbiden access'})
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(err){
          return res.status(401).send({message: 'forbiden access'});
        }
        req.decoded = decoded;
        next();
      } )
    }
    
    //verify admin midaleweare

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      

      const query = {email: email}
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send({message: 'forbiden access'})
      }
      next()
    }

    //verify admin token api
    app.get('/users/admin/:email', verifyToken, async (req, res)=> {
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'unauthorized access'})
      }
      const query = {email: email};
      const user = await userCollection.findOne(query)
      let admin = false;
      if(user){
        admin = user?.role === 'admin';
      }
      res.send({admin})
    })

    


    //User Related API
    app.post('/users', async(req, res)=>{
        const user = req.body;
        //if user already exist
        const query = {email: user.email}
        const existingUser = await userCollection.findOne(query);

        if(existingUser){
          return res.send({massage:'user already exist', insertedId: null});  
        }

        const result = await userCollection.insertOne(user);
        res.send(result);
    })

    //get user data
    app.get('/users',   verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })
    //Delete user Data
    app.delete('/user/:id', verifyToken, async (req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await userCollection.deleteOne(query);
      res.send(result)
    })

    //Admin realated api
    app.patch('/user/admin/:id', verifyToken, verifyAdmin,  async (req, res)=>{
      const id =req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    //Load Menu api
    app.post('/menus', verifyToken, verifyAdmin, async(req, res)=>{
      const item = req.body;
      const result = await bistroDbCollection.insertOne(item);
      res.send(result)
    });
    app.get('/menus', async(req, res)=> {
        const result = await bistroDbCollection.find().toArray()
        res.send(result);
    });
    app.get('/menus/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await bistroDbCollection.findOne(query)
      res.send(result)
    })
    app.patch('/menus/:id', async(req, res)=>{
      const item = req.body;
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set:{
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
      }
      const result = await bistroDbCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })
    app.delete('/menus/:id', verifyToken, verifyAdmin, async (req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await bistroDbCollection.deleteOne(query);
      res.send(result);
    });


    //Load Review API
    app.get('/review', async(req, res)=> {
        const result = await BistroReview.find().toArray();
        res.send(result)
    });

    //Cart Section
    app.post('/carts', async (req, res)=>{
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    })
    //get cart section
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = {email: email}
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    })

    //Delete Data
    app.delete('/carts/:id', async (req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });



    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);







app.get('/', (req, res)=> {
    res.send('boss is running')
})


app.listen(port, ()=>{
    console.log(`bistro boss is sitting on port ${port}`);
});