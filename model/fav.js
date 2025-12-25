import { DataTypes } from "sequelize";
import sequelize from "./index.js";
import Product from "./product.js";
import buyer from "./buyer.js";

const Fav = sequelize.define(
    "Favs",
    {
        id:{type: DataTypes.UUID,primaryKey:true,allowNull:false,defaultValue:DataTypes.UUIDV4},
        ownerId: {type: DataTypes.UUID,allowNull: false,references: {model: 'buyer',key: 'id'},field: 'owner_id'},
        //TODOS
           // figure out how to make sure those UUIDV4s are from products as a ,fk
        products:{type: DataTypes.ARRAY(DataTypes.UUIDV4),defaultValue:[],references: {model: 'product',key: 'id'},field: 'product_id'},
    }
);
export default Favs;