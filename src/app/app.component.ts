import { Component } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import { FileSaverService } from 'ngx-filesaver';
import * as XLSX from 'xlsx';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'xlsmergetool';
  seleccion = 'Consolidado';
  validate_file_size: boolean = false;
  max_file_size: number = 10;
  max_file_count: number = 50;
  files: any[] = [];
  accept: string = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel';

  constructor(
    private toastr: ToastrService,
    private fileServerService: FileSaverService,
    private spinner: NgxSpinnerService
    ) { }

  select_option(opcion: string) {
    this.seleccion = opcion;
    this.files = [];
    this.validate_file_size = false;
  }

  dropped(files: NgxFileDropEntry[]) {
    for (const droppedFile of files) {
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            if (reader.result != null) {
              let new_file = {
                name: file.name,
                type: file.type,
                size: file.size,
                file_base64: reader.result.toString().split(',')[1],
              };
              this.files.push(new_file);
              this.validate_files();
            }
          };
        });
      }
    }
  }

  validate_files() {
    this.validate_file_size = true;
    this.files.forEach((file: any) => {
      if (file.size > (this.max_file_size * 1024 * 1024)) {
        this.validate_file_size = false;
      }
    });
  }

  download_file(item: any) {
    this.download(item);
  }

  download(item: any) {
    const byteCharacters = atob(item.file_base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
       byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: item.type});
    this.fileServerService.save(blob, item.name);
  }

  delete_file(file: any) {
    let new_files: NgxFileDropEntry[] = [];
    this.files.forEach(element => {
      if (element != file) {
        new_files.push(element);
      }
    });
    this.files = new_files;
    this.validate_files();
  }

  do_consolidado() {
    this.files.forEach((file: any) => {
      let workbook = XLSX.read(file.file_base64, { type: 'base64' });
      let content: any[] = [];
      workbook.SheetNames.forEach(sheetName => {
        let worksheet = workbook.Sheets[sheetName];
        let worksheet_json = XLSX.utils.sheet_to_json(worksheet);
        worksheet_json.forEach((row: any) => {
          row['Ajuste Distribuido'] = '';
        });
        content.push(worksheet_json);
      });
      file.content = content;
    });
    this.merge_xlsx(this.files, 'merged');
  }

  process_files(seleccion: string) {
    if (seleccion == 'Consolidado') {
      this.spinner.show();
      setTimeout(() => {
        this.do_consolidado();
        this.spinner.hide();
        this.files = [];
        this.validate_files();
      }, 100)
    } else {
      console.log(this.seleccion);
    }
  }

  merge_xlsx(files: any[], filename: string) {
    let merged: any[] = [];
    files.forEach((file: any) => {
      file.content.forEach((sheet: any) => {
        sheet.forEach((row: any) => {
          merged.push(row);
        });
      });
    });
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    wb.Props = {
      Title: 'Consolidado de Plan Celular',
      Subject: 'Consolidado de Plan Celular',
      Author: 'Grupo KFC',
      CreatedDate: new Date(),
      Keywords: 'office Plan Celular',
      Category: 'Plan Celular',
    };
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(merged);
    XLSX.utils.book_append_sheet(wb,ws,'Hoja1');
    const filename_xlsx: string = (new Date()).toLocaleDateString() + '_' + filename + '.xlsx';
    XLSX.writeFile(wb, filename_xlsx);
  }
}
