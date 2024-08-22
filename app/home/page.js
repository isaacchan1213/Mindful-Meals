'use client'
import {useState, useEffect} from 'react'
import { useRouter } from 'next/navigation';
import { auth, firestore } from '@/firebase'; // Ensure you import Firestore
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { TextField, Autocomplete } from '@mui/material'
import { query, getDocs, collection, deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import axios from 'axios';

export default function Home() {
    const [inventory, setInventory] = useState([])
    const [open, setOpen] = useState(false)
    const [open2, setOpen2] = useState(false)
    const [open3, setOpen3] = useState(false)
    const [itemName, setItemName] = useState('')
    const [initCalories, setInitCalories] = useState([])
    const [itemCalorie, setItemCalorie] = useState([])
    const [initTargetCal, setInitTargetCal] = useState([])
    const [targetCal, setTargetCal] = useState([])
    const [inputValue, setInputValue] = useState('') 
    const [loading, setLoading] = useState(true);
    const router = useRouter(); // Router instance for redirection

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!user) {
          router.push('/'); // Redirect to login if not authenticated
        } else {
          updateInventory(); // Fetch data if user is authenticated
          fetchTargetCalorie(); // Fetch target calorie if user is authenticated
          setLoading(false); // Set loading to false when done
        }
      });
  
      return () => unsubscribe(); // Clean up subscription on unmount
    }, [router]);

    const fetchTargetCalorie = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
          console.log("User not authenticated");
          return;
        }
  
        try {
          console.log("i run")
          const docRef = doc(firestore, `users/${userId}/settings`, 'calorieTarget');
          const docSnap = await getDoc(docRef);
  
          if (docSnap.exists()) {
            console.log('Document found:', docSnap.data());
            setTargetCal(docSnap.data().target);
          } else {
            setTargetCal(0);
            console.log('No target calorie data found.');
          }
        } catch (error) {
          console.error('Error fetching target calorie:', error);
        }
    };

    const addTargetCal = async (targetCalorie) => {
      const userId = auth.currentUser?.uid; // Get the current user ID
      if (!userId) return; // Exit if no user is authenticated

      try {
        const docRef = doc(collection(firestore, `users/${userId}/settings`), 'calorieTarget')
        await setDoc(docRef, {target: Number(targetCalorie)})
      } catch(error) {
        console.error('Error inserting target calories:', error);
      }
    }

    const resetTarget = async () => {
      const userId = auth.currentUser?.uid; // Get the current user ID
      if (!userId) return; // Exit if no user is authenticated

      try {
        const docRef = doc(collection(firestore, `users/${userId}/settings`), 'calorieTarget')
        await deleteDoc(docRef)

      } catch(error) {
        console.error('Error resetting target calories:', error);
      }
    }

    const updateInventory =  async  () => {
      const userId = auth.currentUser?.uid; // Get the current user ID
      if (!userId) return; // Exit if no user is authenticated

      try {
        const snapshot = query(collection(firestore, `users/${userId}/inventory`))
        const docs = await getDocs(snapshot)
        const inventoryList = []
        docs.forEach((doc)=>{
          inventoryList.push({
            name: doc.id,
            ...doc.data(),
          });
        });
        setInventory(inventoryList)
      } catch(error) {
        console.error('Error updating inventory:', error);
      }
    }

    const addInitItem = async (item, cals) => {
      console.log(cals)
      const userId = auth.currentUser?.uid; // Get the current user ID
      if (!userId) return; // Exit if no user is authenticated

      try {
        const docRef = doc(collection(firestore, `users/${userId}/inventory`), item)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            const quantity = docSnap.data().quantity
            const totalCalories = Number(docSnap.data().totalCalories)
            const itemCalories = Number(docSnap.data().itemCalories)
            await setDoc(docRef, {quantity: quantity + 1, itemCalories: Number(cals), totalCalories: totalCalories + itemCalories})
          } else {
            await setDoc(docRef, {quantity: 1, itemCalories: Number(cals), totalCalories: Number(cals)})
          }
          await updateInventory()
      } catch(error) {
        console.error('Error adding item or updating cals:', error);
      }
    }

    const addItem = async (item) => {
      const userId = auth.currentUser?.uid; // Get the current user ID
      if (!userId) return; // Exit if no user is authenticated

      try {
        const docRef = doc(collection(firestore, `users/${userId}/inventory`), item)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            const quantity = docSnap.data().quantity
            const totalCalories = Number(docSnap.data().totalCalories)
            const itemCalories = Number(docSnap.data().itemCalories)
            await setDoc(docRef, {quantity: quantity + 1, itemCalories: itemCalories, totalCalories: totalCalories + itemCalories})
          } else {
            console.error('Item does not exist. Initialize the item first.');
          }
          await updateInventory()
      } catch(error) {
        console.error('Error adding item or updating cals:', error);
      }
    }

    const removeItem = async (item) => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      try {
        const docRef = doc(collection(firestore, `users/${userId}/inventory`), item)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const quantity = docSnap.data().quantity
          const totalCalories = Number(docSnap.data().totalCalories)
          const itemCalories = Number(docSnap.data().itemCalories)
          if (quantity === 1) {
            await deleteDoc(docRef) 
          } else {
            await setDoc(docRef, {quantity: quantity - 1, itemCalories: itemCalories, totalCalories: totalCalories - itemCalories})
          }
        }
        await updateInventory()
      } catch(error) {
        console.error('Error removing item:', error);
      }
    }

    const clearAllInventoryItems = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
    
      try {
        // Get a reference to the inventory collection for the current user
        const inventoryCollectionRef = collection(firestore, `users/${userId}/inventory`);
    
        // Fetch all documents from the inventory collection
        const snapshot = await getDocs(inventoryCollectionRef);
    
        // Iterate over the documents and delete each one
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    
        // Wait for all delete operations to complete
        await Promise.all(deletePromises);
    
        console.log('All inventory items cleared.');
        // Optionally, update your UI or state here
        setInventory([]);
      } catch (error) {
        console.error('Error clearing inventory items:', error);
      }
    };

    const handleLogout = async () => {
      try {
        await signOut(auth);
        router.push('/'); // Redirect to login page after logout
      } catch (error) {
        console.error('Error logging out:', error);
      }
    };

    useEffect(() => {
      fetchTargetCalorie()
      updateInventory()
    }, [])

    useEffect(() => {
      if (loading) return; // Do nothing if still loading

      if (targetCal === 0) {
        handleOpen3(); // Open settings modal if no target calorie is set
      }
    }, [targetCal, loading]);

    const handleInputChange = (event, newInputValue) => {
      setInputValue(newInputValue);
    };

    const filteredInventory = inventory.filter(item =>
      item.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    const totalCalories = filteredInventory.reduce((sum, item) => sum + item.totalCalories, 0);
    
    const progressPercentage = targetCal > 0 
    ? ((totalCalories/targetCal)*100)
    : 0;

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const handleOpen2 = () => setOpen2(true);
    const handleClose2 = () => setOpen2(false);
    
    const handleOpen3 = () => setOpen3(true);
    const handleClose3 = () => setOpen3(false);

    const getAISuggestion = async () => {
      try {
          const response = await axios.post('https://inventory-management-eta-lime.vercel.app/api/get-calories', {
              food: itemName
          });
          setInitCalories(response.data.response || ''); 
      } catch (error) {
          console.error(error.response.data);
      }
    };
    
    return (
    <div className='flex flex-col items-center w-full h-full overflow-y-auto'>
      <div className='sticky top-0 w-full p-2 flex flex-row justify-between z-10 bg-[#FFF8DC]'>
        <button
            onClick={handleOpen2}
            className="rounded bg-blue-600 px-4 py-2 text-lg text-white hover:shadow-xl hover:bg-blue-700"
          >
            Settings
        </button>
        <button
            onClick={handleLogout}
            className="rounded bg-red-600 px-4 py-2 text-lg text-white hover:shadow-xl hover:bg-red-700"
          >
            Logout
        </button>
      </div>

      <div className="relative">
      {open && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-[400px] p-4 border border-gray-400 shadow-lg rounded-lg relative">
            <h2 className="text-lg font-semibold mb-4">Add Item</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder='Food Name'
                className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-[75%]"
              />
              <style>
                {`
                  input[type="number"]::-webkit-inner-spin-button,
                  input[type="number"]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                  }

                  input[type="number"] {
                    -moz-appearance: textfield;
                  }
                `}
              </style>
              <input
                type="number"
                value={initCalories}
                onChange={(e) => { setInitCalories(e.target.value); setItemCalorie(e.target.value);}}
                placeholder='Calories'
                className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-[25%]"
                inputMode="numeric"
                min="0"
                step="1"
              />
              <button
                onClick={() => {
                  addInitItem(itemName, initCalories);
                  setItemName('');
                  setInitCalories('')
                  handleClose();
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded border border-transparent hover:shadow-m hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <p>Don&apos;t know the calories?</p>
            <button
                  onClick={getAISuggestion} 
                  className="bg-green-600 text-white px-2 py-2 rounded border border-transparent hover:shadow-m hover:bg-green-700"
              >
                  Get AI Suggestion
            </button>
            <button
              onClick={handleClose}
              className="bg-red-500 text-white w-full mt-2 rounded hover:shadow-m hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
      </div>

      <div className="relative">
        {open2 && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white w-[400px] p-4 border border-gray-400 shadow-lg rounded-lg relative">
              <h2 className="text-lg font-semibold mb-4">Settings</h2>
              <div className="flex gap-2 mb-4">
                <style>
                    {`
                      input[type="number"]::-webkit-inner-spin-button,
                      input[type="number"]::-webkit-outer-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                      }

                      input[type="number"] {
                        -moz-appearance: textfield;
                      }
                    `}
                </style>
                <input
                    type="number"
                    value={initTargetCal}
                    onChange={(e) => setInitTargetCal(e.target.value)}
                    placeholder='Target Calories'
                    className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-[75%]"
                    inputMode="numeric"
                    min="0"
                    step="1"
                />
                <button
                  onClick={() => {
                    addTargetCal(initTargetCal);
                    setTargetCal(initTargetCal)
                    handleClose2();
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded border border-transparent hover:shadow-m hover:bg-blue-700"
                >
                  Set
                </button>
                <button
                  onClick={() => {
                    resetTarget();
                    setInitTargetCal('')
                    setTargetCal('')
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded border border-transparent hover:shadow-m hover:bg-blue-700"
                >
                  Reset
                </button>
              </div>
              <button
                onClick={handleClose2}
                className="bg-red-500 text-white w-full mt-2 rounded hover:shadow-m hover:bg-red-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        {open3 && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white w-[400px] p-4 border border-gray-400 shadow-lg rounded-lg relative">
              <h2 className="text-lg font-semibold mb-4">Please set your target calories first</h2>
              <div className="flex gap-2 mb-4">
                <style>
                    {`
                      input[type="number"]::-webkit-inner-spin-button,
                      input[type="number"]::-webkit-outer-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                      }

                      input[type="number"] {
                        -moz-appearance: textfield;
                      }
                    `}
                </style>
                <input
                    type="number"
                    value={initTargetCal}
                    onChange={(e) => setInitTargetCal(e.target.value)}
                    placeholder='Target Calories'
                    className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-[75%]"
                    inputMode="numeric"
                    min="0"
                    step="1"
                />
                <button
                  onClick={() => {
                    addTargetCal(initTargetCal);
                    setTargetCal(initTargetCal)
                    handleClose3();
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded border border-transparent hover:shadow-m hover:bg-blue-700"
                >
                  Set
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className='flex flex-col items-center md:flex-row gap-2 justify-center mb-5'>
        <div className='flex flex-row gap-2 h-full'>
          <button className='rounded bg-blue-600 px-4 py-2 text-lg text-white hover:shadow-xl hover:bg-blue-700' onClick={() => {
            handleOpen()
          }}>
            <p className='text-[14px]'>Add New Item</p>
          </button>
          <button className='rounded bg-blue-600 px-4 py-2 text-lg text-white hover:shadow-xl hover:bg-blue-700' onClick={() => {
            clearAllInventoryItems()
          }}>
            <p className='text-[14px]'>Clear</p>
          </button>
        </div>
        <Autocomplete
          sx={{ width: '300px'}}
          id="free-solo-demo"
          freeSolo
          options={inventory.map((option) => option.name)}
          renderInput={(params) => <TextField {...params} label="Search for food" />}
          inputValue={inputValue}
          onInputChange={handleInputChange}
        />
      </div>

      <div className='w-full h-full xl:w-[1280px] flex flex-col-reverse md:flex-row justify-center items-center gap-5 lg:gap-10'>
        <div className='w-[80%] h-full md:w-full flex flex-col gap-2'>
          <div className='flex flex-col items-center gap-1 md:hidden'>
            <div className='relative w-[200px] h-[100px]'>
              <div
                role="progressbar"
                aria-valuenow={progressPercentage}
                aria-valuemin="0"
                aria-valuemax="100"
                style={{ '--value': progressPercentage }}
                className="absolute top-0 left-0 w-full h-full" 
              />
              <div className='absolute inset-0 flex items-center justify-center top-[30%]'>
                {targetCal > 0 ? (
                  <div className='text-xl font-bold text-[#333]'>
                    {totalCalories}/{targetCal}
                  </div>
                ) : (
                  <div className='text-xl font-bold text-[#333]'>
                    Input target calorie
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className='border border-gray-800 rounded-md w-full h-[500px] md:h-[600px] flex flex-col'>
            <div className='w-full h-[125px] bg-[#a4b5fd] flex items-center justify-center rounded-md'>
              <h2 className='text-[#333] text-[24px] md:text-[30px] text-center'>
                  Start tracking your food now!
              </h2>
            </div>
            <div className='flex-1 overflow-y-auto flex flex-col gap-2 lg:gap-4 rounded-md'> 
              {filteredInventory.map(({name, quantity, totalCalories}) => (
                <div key={name} className='w-full min-h-[100px] md:min-h-[150px] flex items-center justify-between bg-[#f0f0f0] p-2'>
                  <div className='flex-shrink-0 max-w-[30%]'>
                    <h3 className='text-[#333] text-[25px] md:text-[25px] lg:text-[30px] xl:text-[40px] whitespace-normal break-words'>
                      {quantity === 1 ? name.charAt(0).toUpperCase() + name.slice(1) + ':' : quantity + ' ' + name.charAt(0).toUpperCase() + name.slice(1) + ':'}
                    </h3>    
                  </div>   
                  <div className='text-[#333] text-[25px] md:text-[25px] lg:text-[40px] text-center w-full'>
                    {totalCalories + ' cals'}
                  </div>
                  <div className='flex flex-col md:flex-row gap-2'>
                      <button className='bg-blue-600 text-white py-2 px-4 rounded shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400' onClick={() => {
                        addItem(name)
                      }}>
                        Add
                      </button>
                      <button className='bg-red-600 text-white py-2 px-4 rounded shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400' onClick={() => {
                        removeItem(name)
                      }}>
                        Remove
                      </button>
                  </div>
                </div>
                ))}
            </div>
          </div>
        </div>
        <div className='hidden md:flex flex-col items-center gap-1'>
          <div className='relative w-[350px] h-[150px] lg:w-[400px] md:h-[200px]'>
            <div
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin="0"
              aria-valuemax="100"
              style={{ '--value': progressPercentage }}
              className="absolute top-0 left-0 w-full h-full" 
            />
            <div className='absolute inset-0 flex items-center justify-center top-[30%]'>
              {targetCal > 0 ? (
                <div className='text-xl font-bold text-[#333]'>
                  {totalCalories}/{targetCal}
                </div>
              ) : (
                <div className='text-xl font-bold text-[#333]'>
                  Input target calorie
                </div>
              )}
            </div>
          </div>
          <h2 className='font-semibold text-[35px]'>
            Progress
          </h2>
      </div>
    </div>
  </div>
)}