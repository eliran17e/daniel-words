import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AudioRecorder from "./components/AudioRecorder";
import ManageWords from "./components/ManageWords";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AudioRecorder />} />
        <Route path="/manage" element={<ManageWords />} />
        <Route path="*" element={<AudioRecorder />} />
      </Routes>
    </BrowserRouter>
  );
}
