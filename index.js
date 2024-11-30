import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "review",
  password: "1",
  port: 5432, // ใช้ Integer
});

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error("Could not connect to database:", err.message);
  } else {
    console.log("Connected to database");
  }
});

// Set up the view engine
app.set("view engine", "ejs");
app.set("views", "./views");

app.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT animals.id AS animal_id, animals.name AS animal_name, comment.comment_text, comment.rating " +
        "FROM animals LEFT JOIN comment ON animals.id = comment.animal_id ORDER BY animals.id ASC"
    );
    const animalsWithComments = result.rows;

    res.render("index.ejs", {
      listAnimalsWithComments: animalsWithComments.length
        ? animalsWithComments
        : [],
    });
  } catch (err) {
    console.error("Error with database query:", err.message);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/add", async (req, res) => {
  const { animal_name, comment, rating } = req.body;
  try {
    const animalResult = await db.query(
      "INSERT INTO animals (name) VALUES ($1) RETURNING id",
      [animal_name]
    );
    const animalId = animalResult.rows[0].id;

    await db.query(
      "INSERT INTO comment (animal_id, comment_text, rating) VALUES ($1, $2, $3)",
      [animalId, comment, rating]
    );

    res.redirect("/");
  } catch (err) {
    console.error("Error adding new animal and comment:", err.message);
    res.status(500).send("Error adding new animal and comment");
  }
});

app.post("/edit", async (req, res) => {
  const {
    updateAnimalId,
    updateAnimalName,
    updateAnimalComment,
    updateAnimalRating,
  } = req.body;

  try {
    await db.query("UPDATE animals SET name = $1 WHERE id = $2", [
      updateAnimalName,
      updateAnimalId,
    ]);

    await db.query(
      "UPDATE comment SET comment_text = $1, rating = $2 WHERE animal_id = $3",
      [updateAnimalComment, updateAnimalRating, updateAnimalId]
    );

    res.redirect("/");
  } catch (err) {
    console.error("Error updating item:", err.message);
    res.status(500).send("Error updating item.");
  }
});

app.post("/delete", async (req, res) => {
  const { deleteItemId } = req.body;

  // ตรวจสอบว่ามี deleteItemId ส่งมาหรือไม่
  if (!deleteItemId) {
    return res.status(400).send("Bad Request: Missing deleteItemId.");
  }

  try {
    // ลบข้อมูลในตาราง comment ก่อน (ป้องกัน constraint violation)
    await db.query("DELETE FROM comment WHERE animal_id = $1", [deleteItemId]);

    // ลบข้อมูลในตาราง animals
    await db.query("DELETE FROM animals WHERE id = $1", [deleteItemId]);

    res.redirect("/");
  } catch (err) {
    console.error("Error deleting item:", err.message);
    res.status(500).send("Error deleting item.");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
