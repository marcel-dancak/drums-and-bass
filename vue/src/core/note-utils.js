import { Note } from 'tonal'

export const asciNote = name => name.replace('♭', 'b').replace('♯', '#')

const BassRootNotes = {
  C: Note.props('C3'),
  G: Note.props('G2'),
  D: Note.props('D2'),
  A: Note.props('A1'),
  E: Note.props('E1'),
  B: Note.props('B0')
}

export function bassFret (string, note) {
  const rootNote = BassRootNotes[string]
  const noteMidi = Note.midi(asciNote(note.name + note.octave))
  // console.log(string.midi, noteMidi)
  return noteMidi - rootNote.midi
}

export function noteProps (note) {
  return Note.props(asciNote(note.name + note.octave))
}

export function noteDetune (note, offset) {
  const props = noteProps(note)
  const newNote = Note.props(Note.fromMidi(props.midi + offset))
  return {
    name: Note.enharmonic(newNote.pc),
    octave: newNote.oct
  }
}
